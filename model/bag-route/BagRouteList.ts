import { makeAutoObservable, runInAction } from 'mobx';
import app from '@/model/app/App';
import BagRoute from '@/model/bag-route/BagRoute';
import { BagRouteEntry } from '@/model/bag-route/BagRouteEntry';
import Group from '@/model/group/Group';
import GroupError from '@/model/group/GroupError';
import GroupValidationError from '@/model/group/GroupValidationError';
import { GROUP_MAX_ROUTE_COUNT } from '@/model/group/GroupLimits';
import GpxParser from '@/model/route/GpxParser';
import { mergeRouteBounds } from '@/model/route/RouteCamera';
import { RouteBounds, RouteDraft } from '@/model/route/RouteData';
import { getRouteErrorMessage } from '@/model/route/RouteErrorMessage';
import RoutePicker from '@/model/route/RoutePicker';
import RouteValidator from '@/model/route/RouteValidator';
import BagRouteDispatcher, { LinkedGroupRoute } from './BagRouteDispatcher';
import BagRouteSelection from './BagRouteSelection';

const GPX_EXTENSION_PATTERN = /\.gpx$/i;

/**
 * 목록에서 코스를 **고른** 요청 (BD-11). 지도가 이 요청마다 카메라를 그 코스로 옮긴다.
 * `seq`가 고를 때마다 올라가 이미 선택된 코스를 다시 골라도 새 요청이 된다.
 */
export interface BagRouteFocusRequest {
  key: string;
  seq: number;
}

/**
 * 배낭 코스 화면 모델 (BD-11).
 *
 * 내 배낭 코스 + **연결된 그룹의 코스(읽기 전용)** 를 한 목록으로 내놓고, 선택한 코스를
 * 지도·고도 그래프가 따라간다. 파일 선택 → 파싱 → 업로드 → 목록 갱신이 한 흐름이라
 * 화면은 `addRoute()` 하나만 부르고 진행 상태는 `isSubmitting()`으로 본다.
 *
 * 파서·검증·상한은 그룹 코스(GRP-8)와 같은 것을 쓴다 — 사는 곳만 다르다(DM-30).
 */
class BagRouteList {
  private routes: BagRoute[] = [];
  private groupRoutes: LinkedGroupRoute[] = [];
  private linkedGroups: Group[] = [];
  private selectedKey: string | null = null;
  // 사용자가 마지막으로 고른 목록 키(BD-11 선택 기억). 초기화 때 기기에서 읽고, 고를 때마다 바뀐다.
  private rememberedKey: string | null = null;
  private focusRequest: BagRouteFocusRequest | null = null;
  private loading = false;
  private initialized = false;
  private submitting = false;
  private error: Error | null = null;

  public static from(dispatcher: BagRouteDispatcher, bagId: string) {
    return new BagRouteList(dispatcher, bagId);
  }

  private constructor(
    private readonly dispatcher: BagRouteDispatcher,
    private readonly bagId: string
  ) {
    makeAutoObservable(this);
  }

  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const rememberedKey = await BagRouteSelection.load(this.bagId);

    runInAction(() => {
      this.rememberedKey = rememberedKey;
    });
    await this.load(false);
  }

  public async refresh(quiet = false): Promise<void> {
    await this.load(quiet);
  }

  public getBagId(): string {
    return this.bagId;
  }

  public getRoutes(): BagRoute[] {
    return this.routes;
  }

  /**
   * 목록 한 벌 — 내 코스가 먼저고 그 뒤가 연결 그룹 코스다 (BD-11).
   * 내가 손댈 수 있는 것을 위에 둔다.
   *
   * **중복 접기**(BD-11 2026-10-13): 이 배낭의 코스를 `그룹에 올리기`로 복사한 그룹 코스(`sourceBagRouteId`가
   * 내 코스 id)는 빼고, 그 내 코스에 `sharedToGroup`을 붙인다. 원본을 지우면 그룹 코스가 다시 보인다.
   */
  public getEntries(): BagRouteEntry[] {
    const sharedIds = this.getSharedRouteIds();

    return [
      ...this.routes.map(route => ({
        key: BagRouteSelection.toBagEntryKey(route.getId()),
        route,
        owned: true,
        ...(sharedIds.has(route.getId()) ? { sharedToGroup: true } : {}),
      })),
      ...this.groupRoutes
        .filter(item => !this.isFoldedGroupRoute(item, sharedIds))
        .map(item => ({
          key: BagRouteSelection.toGroupEntryKey(item.route.getId()),
          route: item.route,
          groupName: item.groupName,
          owned: false,
        })),
    ];
  }

  public getSelectedKey(): string | null {
    return this.selectedKey;
  }

  public selectEntry(key: string | null): void {
    this.selectedKey = key;
  }

  /**
   * 사용자가 목록에서 코스를 고른다 (BD-11). 선택에 더해 카메라 맞춤 요청을 남긴다 — 로드 후
   * 자동 선택·코스 추가 후 선택(`selectEntry`)은 카메라를 옮기지 않는다.
   */
  public focusEntry(key: string): void {
    this.selectedKey = key;
    this.focusRequest = { key, seq: (this.focusRequest?.seq ?? 0) + 1 };
    // 사용자가 고른 것만 기억한다(BD-11) — 다음에 열 때 이 코스가 선택돼 있다.
    this.rememberedKey = key;
    void BagRouteSelection.save(this.bagId, key);
  }

  public getFocusRequest(): BagRouteFocusRequest | null {
    return this.focusRequest;
  }

  public getSelectedEntry(): BagRouteEntry | null {
    const entries = this.getEntries();

    return entries.find(entry => entry.key === this.selectedKey) ?? null;
  }

  public getCount(): number {
    return this.routes.length;
  }

  // 배낭에 담긴 코스의 총 거리(m). 타일 부제가 쓴다(BD-10·BD-11).
  public getTotalDistance(): number {
    return this.routes.reduce((sum, route) => sum + route.getDistance(), 0);
  }

  /**
   * 목록의 모든 코스를 담는 경계 상자 (BD-11). 최초 카메라를 이 상자에 맞춘다.
   * 코스가 하나도 없으면 `null`이고, 그때 지도는 남한 전역에 머문다.
   */
  public getContentBounds(): RouteBounds | null {
    return mergeRouteBounds(
      this.getEntries().map(entry => entry.route.getBounds())
    );
  }

  public getLinkedGroups(): Group[] {
    return this.linkedGroups;
  }

  // 상한 5개 (DM-30 — 그룹과 같은 값). 화면은 이 값으로 `코스 추가`를 막고 안내를 띄운다.
  public isFull(): boolean {
    return this.routes.length >= GROUP_MAX_ROUTE_COUNT;
  }

  public isEmpty(): boolean {
    return this.getEntries().length === 0;
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

  // 파일 선택기가 없는 환경(웹)에서는 추가 액션 자체를 그리지 않는다(APP-5, BD-11).
  // 오프라인에서도 추가·삭제·그룹에 올리기를 숨긴다(OF-6 — OF-5 편집 금지 규칙). 뒤집기·내보내기는 남는다.
  public canAdd(): boolean {
    return RoutePicker.isSupported() && !app.getNetworkStatus().isOffline();
  }

  // 연결된 그룹이 없으면 `그룹에 올리기`를 노출하지 않는다(BD-11).
  public canUploadToGroup(): boolean {
    return this.canAdd() && this.linkedGroups.length > 0;
  }

  public getLimitMessage(): string {
    return getRouteErrorMessage(
      new GroupError(GroupValidationError.RouteLimitExceeded)
    );
  }

  /**
   * 코스 추가 — 파일 선택 → 용량 검사 → 파싱 → 업로드 → Firestore → 목록 갱신 (BD-11).
   * 선택을 취소하면 아무 안내 없이 끝난다.
   */
  public async addRoute(): Promise<boolean> {
    if (this.submitting) {
      return false;
    }

    if (this.isFull()) {
      this.showMessage(this.getLimitMessage());

      return false;
    }

    try {
      const picked = await RoutePicker.pick();

      if (!picked) {
        return false;
      }

      this.setSubmitting(true);

      // 용량은 파일을 읽기 전에 본다 — 5MB를 다 읽고 거절하면 그만큼이 헛일이다.
      GpxParser.validateFileSize(picked.size);

      const parsed = GpxParser.parse(await RoutePicker.readText(picked.uri));
      const draft: RouteDraft = {
        // 트랙 이름이 있으면 그것을, 없으면 파일명을 쓴다. 40자 절단은 검증기가 한다.
        name: RouteValidator.toRouteName(
          parsed.name || picked.name.replace(GPX_EXTENSION_PATTERN, '')
        ),
        fileSize: picked.size,
        distance: parsed.distance,
        pointCount: parsed.pointCount,
        bounds: parsed.bounds,
        simplified: parsed.simplified,
        // 고도가 하나도 없는 파일에는 키를 넣지 않는다 — 0을 넣으면 "상승 0m"로 읽힌다.
        ...(parsed.elevationGain !== null
          ? { elevationGain: parsed.elevationGain }
          : {}),
        // 하강도 같은 규칙이다 — 뒤집어 볼 때의 상승이 이 값이다(GRP-8).
        ...(parsed.elevationLoss !== null
          ? { elevationLoss: parsed.elevationLoss }
          : {}),
      };

      const routeId = await this.submitDraft(draft, picked.uri);

      // 방금 올린 코스를 바로 보여준다 — 지도·그래프가 그 코스로 옮겨간다.
      this.selectEntry(BagRouteSelection.toBagEntryKey(routeId));

      return true;
    } catch (error) {
      this.showMessage(getRouteErrorMessage(error));

      return false;
    } finally {
      this.setSubmitting(false);
    }
  }

  /**
   * 지도에서 그린 코스를 올린다 (RD-3). 파일은 이미 만들어져 있다 — 그 뒤는 가져오기와 **같은 경로**다
   * (디스패처 검증·업로드·상한 검사, `click_bag_route_upload`, 목록 갱신). 올린 코스 id를 돌려준다 — 고르고 카메라를
   * 맞추는 일은 그리기 모드를 나간 뒤 화면이 한다(`RouteDrawHost.onSaved`). 실패하면 가져오기와 같은 문구로 알리고
   * `null`(그리기 모드에 남는다).
   */
  public async addDrawnRoute(
    draft: RouteDraft,
    localUri: string
  ): Promise<string | null> {
    if (this.submitting) {
      return null;
    }

    if (this.isFull()) {
      this.showMessage(this.getLimitMessage());

      return null;
    }

    this.setSubmitting(true);

    try {
      return await this.submitDraft(draft, localUri);
    } catch (error) {
      this.showMessage(getRouteErrorMessage(error));

      return null;
    } finally {
      this.setSubmitting(false);
    }
  }

  /**
   * 코스 그리기 이름 시트의 기본값 (RD-3) — `{여행지 이름} 코스`, 여행지가 없으면 `{배낭 이름} 코스`. 둘 다 못 읽으면
   * 빈 문자열(그리기 모델이 `그린 코스`로 채운다).
   */
  public async getDrawDefaultName(): Promise<string> {
    const naming = await this.dispatcher.getBagNaming(this.bagId);
    const base = naming.locationName || naming.name;

    return base ? app.getL10n().t('routeDraw.defaultName', { name: base }) : '';
  }

  public async deleteRoute(route: BagRoute): Promise<boolean> {
    if (this.submitting) {
      return false;
    }

    this.setSubmitting(true);

    try {
      await this.dispatcher.deleteRoute(this.bagId, route);
      await this.load(true);

      return true;
    } catch (error) {
      this.showMessage(getRouteErrorMessage(error));

      return false;
    } finally {
      this.setSubmitting(false);
    }
  }

  /**
   * 내 코스를 연결된 그룹에 **복사**한다 (BD-11). 그룹 상한 5개는 그룹 등록 트랜잭션이
   * 검사하고(넘치면 올린 원본을 회수한다), 사용자에게는 그 사유가 그대로 보인다.
   */
  public async uploadToGroup(
    route: BagRoute,
    groupId: string
  ): Promise<boolean> {
    if (this.submitting) {
      return false;
    }

    this.setSubmitting(true);

    try {
      await this.dispatcher.copyToGroup(this.bagId, groupId, route);
      app.getAnalyticsManager()?.logClick('bag_route_to_group');
      this.showMessage(app.getL10n().t('bag.route.toGroupDone'));
      await this.load(true);

      return true;
    } catch (error) {
      this.showMessage(getRouteErrorMessage(error));

      return false;
    } finally {
      this.setSubmitting(false);
    }
  }

  // 올리기 + 측정 + 목록 갱신 — 가져오기(`addRoute`)와 그리기(`addDrawnRoute`)가 함께 쓴다. 올린 코스 id를 돌려준다.
  private async submitDraft(draft: RouteDraft, localUri: string) {
    const routeId = await this.dispatcher.addRoute(this.bagId, draft, localUri);

    app.getAnalyticsManager()?.logClick('bag_route_upload', {
      distance: Math.round(draft.distance),
      point_count: draft.pointCount,
    });
    await this.load(true);

    return routeId;
  }

  private async load(quiet: boolean) {
    if (!quiet) {
      this.setLoading(true);
    }

    this.setError(null);

    try {
      const [routes, linkedGroups] = await Promise.all([
        this.dispatcher.getRoutes(this.bagId),
        // 연결 그룹 조회가 실패해도 내 코스는 보여야 한다 — 그룹 쪽은 부가 정보다.
        this.dispatcher.getLinkedGroups(this.bagId).catch(error => {
          console.warn('[BagRouteList] 연결 그룹 조회 실패', error); // l10n-ignore: 개발자 로그

          return [] as Group[];
        }),
      ]);
      const groupRoutes = await this.dispatcher.getLinkedGroupRoutes(
        this.bagId,
        linkedGroups
      );

      runInAction(() => {
        this.routes = routes;
        this.linkedGroups = linkedGroups;
        this.groupRoutes = groupRoutes;
        this.syncSelection();
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

  // 연결 그룹에 복사본이 있는 내 코스 id(BD-11 중복 접기). 원본 배낭이 이 배낭인 참조만 센다.
  private getSharedRouteIds(): Set<string> {
    const ownIds = new Set(this.routes.map(route => route.getId()));
    const sharedIds = new Set<string>();

    this.groupRoutes.forEach(item => {
      const sourceRouteId = item.route.getSourceBagRouteId();

      if (
        sourceRouteId &&
        item.route.getSourceBagId() === this.bagId &&
        ownIds.has(sourceRouteId)
      ) {
        sharedIds.add(sourceRouteId);
      }
    });

    return sharedIds;
  }

  private isFoldedGroupRoute(
    item: LinkedGroupRoute,
    sharedIds: Set<string>
  ): boolean {
    const sourceRouteId = item.route.getSourceBagRouteId();

    return (
      !!sourceRouteId &&
      item.route.getSourceBagId() === this.bagId &&
      sharedIds.has(sourceRouteId)
    );
  }

  /**
   * 기억된 키를 지금 목록의 키로 맞춘다. 그룹 복사본을 기억했는데 그 코스가 중복 접기로 빠졌으면
   * 원본 내 코스를 가리킨다 — 같은 코스다.
   */
  private resolveRememberedKey(): string | null {
    const key = this.rememberedKey;

    if (!key) {
      return null;
    }

    const folded = this.groupRoutes.find(
      item => BagRouteSelection.toGroupEntryKey(item.route.getId()) === key
    );
    const sourceRouteId = folded?.route.getSourceBagRouteId();

    if (
      folded &&
      sourceRouteId &&
      this.isFoldedGroupRoute(folded, this.getSharedRouteIds())
    ) {
      return BagRouteSelection.toBagEntryKey(sourceRouteId);
    }

    return key;
  }

  /**
   * 선택이 없거나 사라진 코스를 가리키고 있으면 되돌린다(BD-11 선택 기억): 기억된 코스가 목록에 있으면 그것,
   * 없으면 첫 코스(내 코스가 앞이라 내 첫 코스, 없으면 그룹 첫 코스). 자동 선택은 기억하지 않는다.
   */
  private syncSelection() {
    const entries = this.getEntries();

    if (entries.length === 0) {
      this.selectedKey = null;

      return;
    }

    if (entries.some(entry => entry.key === this.selectedKey)) {
      return;
    }

    const rememberedKey = this.resolveRememberedKey();

    this.selectedKey = entries.some(entry => entry.key === rememberedKey)
      ? rememberedKey
      : entries[0].key;
  }

  private showMessage(message: string) {
    app.getToastManager()?.showSimple(message);
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

export default BagRouteList;
