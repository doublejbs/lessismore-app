import { Platform } from 'react-native';
import { makeAutoObservable, runInAction } from 'mobx';
import app from '@/model/app/App';
import BagPoint from '@/model/bag-point/BagPoint';
import BagPointAddVia from '@/model/bag-point/BagPointAddVia';
import { BagPointEntry } from '@/model/bag-point/BagPointEntry';
import Group from '@/model/group/Group';
import GroupError from '@/model/group/GroupError';
import GroupPoint from '@/model/group/GroupPoint';
import GroupValidationError from '@/model/group/GroupValidationError';
import { GROUP_MAX_POINT_COUNT } from '@/model/group/GroupLimits';
import { getGroupErrorMessage } from '@/model/group-error/GroupErrorMessage';
import MapPoint from '@/model/point/MapPoint';
import { PointInput, PointPatch } from '@/model/point/PointData';
import PointType from '@/model/point/PointType';
import { measureRouteBounds } from '@/model/route/RouteCamera';
import { RouteBounds } from '@/model/route/RouteData';
import BagPointDispatcher from './BagPointDispatcher';

// 연결 그룹에서 온 포인트 한 건. 그룹 이름을 함께 들고 있어야 카드·목록에 출처를 적을 수 있다.
interface LinkedGroupPoint {
  groupId: string;
  groupName: string;
  point: GroupPoint;
}

/**
 * 포인트에 초점을 준 요청 (BD-14). 지도가 이 요청마다 카메라를 그 포인트로 옮긴다.
 * `seq`가 고를 때마다 올라가 같은 포인트를 다시 골라도 새 요청이 된다.
 * `zoomIn`은 목록 행 탭처럼 지도 밖에서 고른 경우다 — 그 포인트 부근까지 당겨 보여준다.
 * 마커 탭은 지금 줌을 유지한다(그룹 지도와 같다).
 */
export interface BagPointFocusRequest {
  key: string;
  seq: number;
  zoomIn: boolean;
}

const IS_WEB = Platform.OS === 'web';

/**
 * 배낭 코스 화면의 지도 포인트 모델 (BD-14).
 *
 * 내 배낭 포인트(`bag/{bagId}/points`, DM-33) + **연결된 그룹의 포인트(읽기 전용)** 를 한 목록으로
 * 내놓는다(코스 `BagRouteList`와 같은 문법). 유형 필터·초점·상한도 여기 싣는다 — 지도와 목록이
 * 같은 판정을 봐야 한다. 검증·상한(50)은 그룹 포인트(GRP-9)와 같다.
 */
class BagPointList {
  private points: BagPoint[] = [];
  private groupPoints: LinkedGroupPoint[] = [];
  private selectedType: PointType | null = null;
  private focusedKey: string | null = null;
  private focusRequest: BagPointFocusRequest | null = null;
  private loading = false;
  private initialized = false;
  private submitting = false;
  private error: Error | null = null;

  public static from(dispatcher: BagPointDispatcher, bagId: string) {
    return new BagPointList(dispatcher, bagId);
  }

  private constructor(
    private readonly dispatcher: BagPointDispatcher,
    private readonly bagId: string
  ) {
    makeAutoObservable(this);
  }

  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.load(false);
  }

  public async refresh(quiet = false): Promise<void> {
    await this.load(quiet);
  }

  public getBagId(): string {
    return this.bagId;
  }

  public getPoints(): BagPoint[] {
    return this.points;
  }

  // 한 벌 — 내 포인트가 먼저고 그 뒤가 연결 그룹 포인트다(코스 목록과 같은 순서, BD-11).
  public getEntries(): BagPointEntry[] {
    return [
      ...this.points.map(point => ({
        key: `bag:${point.getId()}`,
        point,
        owned: true,
      })),
      ...this.groupPoints.map(item => ({
        key: `group:${item.groupId}:${item.point.getId()}`,
        point: item.point,
        groupName: item.groupName,
        owned: false,
      })),
    ];
  }

  // 유형 칩이 걸린 목록(GRP-10과 같은 규칙). 필터가 없으면 전체를 그대로 돌려준다.
  public getVisibleEntries(): BagPointEntry[] {
    const entries = this.getEntries();

    if (!this.selectedType) {
      return entries;
    }

    return entries.filter(entry => entry.point.getType() === this.selectedType);
  }

  public getVisiblePoints(): MapPoint[] {
    return this.getVisibleEntries().map(entry => entry.point);
  }

  // 지도 마커가 돌려준 포인트로 목록 한 건을 찾는다. 마커는 모델을 모르고 포인트만 넘긴다.
  public getEntryByPoint(point: MapPoint): BagPointEntry | null {
    return this.getEntries().find(entry => entry.point === point) ?? null;
  }

  public getSelectedType(): PointType | null {
    return this.selectedType;
  }

  // 칩이 초점 포인트를 가리면 초점을 푼다 — 지도에 없는 포인트의 카드가 남지 않게(BD-14).
  public selectType(type: PointType | null): void {
    this.selectedType = type;

    if (
      this.focusedKey &&
      !this.getVisibleEntries().some(entry => entry.key === this.focusedKey)
    ) {
      this.clearFocus();
    }
  }

  public getFocusedKey(): string | null {
    return this.focusedKey;
  }

  public getFocusedEntry(): BagPointEntry | null {
    if (!this.focusedKey) {
      return null;
    }

    return (
      this.getEntries().find(entry => entry.key === this.focusedKey) ?? null
    );
  }

  public getFocusRequest(): BagPointFocusRequest | null {
    return this.focusRequest;
  }

  /**
   * 포인트를 고른다 — 지도 마커 탭·목록 행 탭(BD-14). 카드가 뜨고 카메라 이동 요청이 남는다.
   * 둘 다 `click_bag_point_select`다(Analytics).
   */
  public focusEntry(key: string, zoomIn: boolean): void {
    const entry = this.getEntries().find(item => item.key === key);

    if (!entry) {
      return;
    }

    this.focusedKey = key;
    this.focusRequest = {
      key,
      seq: (this.focusRequest?.seq ?? 0) + 1,
      zoomIn,
    };
    app
      .getAnalyticsManager()
      ?.logClick('bag_point_select', { type: entry.point.getType() });
  }

  public clearFocus(): void {
    this.focusedKey = null;
  }

  // 모든 포인트(그룹 포인트 포함)를 담는 상자. 최초 카메라가 코스 상자와 합쳐 맞춘다(BD-14).
  public getContentBounds(): RouteBounds | null {
    return measureRouteBounds(
      this.getEntries().map(entry => ({
        lat: entry.point.getLatitude(),
        lng: entry.point.getLongitude(),
      }))
    );
  }

  // 내 배낭 포인트 수. 상한·타일 부제가 쓴다 — 연결 그룹 포인트는 세지 않는다.
  public getCount(): number {
    return this.points.length;
  }

  // 지도에 그릴 포인트가 하나라도 있는지(그룹 포인트 포함). 유형 칩 행의 노출 판정에 쓴다.
  public hasAny(): boolean {
    return this.points.length > 0 || this.groupPoints.length > 0;
  }

  // 상한 50 (DM-33 — 그룹과 같은 값). 화면은 이 값으로 추가 액션을 막고 이유를 그 자리에 적는다.
  public isFull(): boolean {
    return this.points.length >= GROUP_MAX_POINT_COUNT;
  }

  public getLimitMessage(): string {
    return getGroupErrorMessage(
      new GroupError(GroupValidationError.PointLimitExceeded)
    );
  }

  // 좌표를 찍을 지도가 없는 웹에서는 추가·수정·삭제를 열지 않는다(BD-14 — 웹은 읽기 전용).
  public canEdit(): boolean {
    return !IS_WEB;
  }

  public isLoading(): boolean {
    return this.loading;
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public isSubmitting(): boolean {
    return this.submitting;
  }

  public getError(): Error | null {
    return this.error;
  }

  /**
   * 포인트 등록 (BD-14). 상한은 여기서 이미 읽어 둔 목록으로 막는다 — 스토어가 서버에 다시 세지
   * 않아 오프라인에서도 막히지 않고, 사용자가 입력을 마친 뒤에 거절당하지 않는다.
   * 성공하면 방금 찍은 포인트에 초점을 준다.
   */
  public async createPoint(
    input: PointInput,
    via: BagPointAddVia
  ): Promise<boolean> {
    if (this.submitting) {
      return false;
    }

    if (this.isFull()) {
      this.showMessage(this.getLimitMessage());

      return false;
    }

    this.setSubmitting(true);

    try {
      const pointId = await this.dispatcher.createPoint(this.bagId, input);

      app
        .getAnalyticsManager()
        ?.logClick('bag_point_add', { type: input.type, via });
      await this.load(true);
      this.setFocusedKey(`bag:${pointId}`);

      return true;
    } catch (error) {
      this.showMessage(getGroupErrorMessage(error));

      return false;
    } finally {
      this.setSubmitting(false);
    }
  }

  public async updatePoint(
    pointId: string,
    patch: PointPatch
  ): Promise<boolean> {
    return this.runWrite(() =>
      this.dispatcher.updatePoint(this.bagId, pointId, patch)
    );
  }

  public async deletePoint(point: BagPoint): Promise<boolean> {
    const deleted = await this.runWrite(() =>
      this.dispatcher.deletePoint(this.bagId, point.getId())
    );

    if (deleted) {
      app
        .getAnalyticsManager()
        ?.logClick('bag_point_delete', { type: point.getType() });
    }

    return deleted;
  }

  private async runWrite(action: () => Promise<void>): Promise<boolean> {
    if (this.submitting) {
      return false;
    }

    this.setSubmitting(true);

    try {
      await action();
      await this.load(true);

      return true;
    } catch (error) {
      this.showMessage(getGroupErrorMessage(error));

      return false;
    } finally {
      this.setSubmitting(false);
    }
  }

  private async load(quiet: boolean) {
    if (!quiet) {
      this.setLoading(true);
    }

    this.setError(null);

    try {
      const [points, linkedGroups] = await Promise.all([
        this.dispatcher.getPoints(this.bagId),
        // 연결 그룹 조회가 실패해도 내 포인트는 보여야 한다 — 그룹 쪽은 부가 정보다.
        this.dispatcher.getLinkedGroups(this.bagId).catch(error => {
          console.warn('[BagPointList] 연결 그룹 조회 실패', error); // l10n-ignore: 개발자 로그

          return [] as Group[];
        }),
      ]);
      const groupPoints = await this.loadGroupPoints(linkedGroups);

      runInAction(() => {
        this.points = points;
        this.groupPoints = groupPoints;
        this.syncFocus();
      });
    } catch (error) {
      this.setError(error as Error);
    } finally {
      runInAction(() => {
        this.loading = false;
        this.initialized = true;
      });
    }
  }

  private async loadGroupPoints(groups: Group[]): Promise<LinkedGroupPoint[]> {
    const loaded = await Promise.all(
      groups.map(async group => {
        try {
          const points = await this.dispatcher.getGroupPoints(group.getId());

          return points.map(point => ({
            groupId: group.getId(),
            groupName: group.getName(),
            point,
          }));
        } catch (error) {
          // 내보내진 그룹의 역인덱스가 남아 있는 경우 등. 나머지 그룹을 막지 않는다.
          console.warn('[BagPointList] 그룹 포인트 조회 실패', error); // l10n-ignore: 개발자 로그

          return [] as LinkedGroupPoint[];
        }
      })
    );

    return loaded.flat();
  }

  // 초점이 사라진 포인트(지워짐)를 가리키면 푼다 — 카드가 빈 대상을 붙들지 않게.
  private syncFocus() {
    if (!this.focusedKey) {
      return;
    }

    if (!this.getEntries().some(entry => entry.key === this.focusedKey)) {
      this.focusedKey = null;
    }
  }

  private showMessage(message: string) {
    app.getToastManager()?.showSimple(message);
  }

  private setFocusedKey(value: string | null) {
    this.focusedKey = value;
  }

  private setLoading(value: boolean) {
    this.loading = value;
  }

  private setSubmitting(value: boolean) {
    this.submitting = value;
  }

  private setError(value: Error | null) {
    this.error = value;
  }
}

export default BagPointList;
