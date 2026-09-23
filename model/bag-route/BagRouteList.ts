import { makeAutoObservable, runInAction } from 'mobx';
import app from '@/model/app/App';
import BagRoute from '@/model/bag-route/BagRoute';
import { BagRouteEntry } from '@/model/bag-route/BagRouteEntry';
import Group from '@/model/group/Group';
import GroupError from '@/model/group/GroupError';
import GroupRoute from '@/model/group/GroupRoute';
import GroupValidationError from '@/model/group/GroupValidationError';
import { GROUP_MAX_ROUTE_COUNT } from '@/model/group/GroupLimits';
import GpxParser from '@/model/route/GpxParser';
import { RouteBounds, RouteDraft } from '@/model/route/RouteData';
import { getRouteErrorMessage } from '@/model/route/RouteErrorMessage';
import RoutePicker from '@/model/route/RoutePicker';
import RouteValidator from '@/model/route/RouteValidator';
import BagRouteDispatcher from './BagRouteDispatcher';

const GPX_EXTENSION_PATTERN = /\.gpx$/i;

// 연결 그룹에서 온 코스 한 건. 그룹 이름을 함께 들고 있어야 목록에 출처를 적을 수 있다.
interface LinkedGroupRoute {
  groupName: string;
  route: GroupRoute;
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
   */
  public getEntries(): BagRouteEntry[] {
    return [
      ...this.routes.map(route => ({
        key: `bag:${route.getId()}`,
        route,
        owned: true,
      })),
      ...this.groupRoutes.map(item => ({
        key: `group:${item.route.getId()}`,
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
    const latitudes: number[] = [];
    const longitudes: number[] = [];

    this.getEntries().forEach(entry => {
      entry.route.getSimplified().forEach(coordinate => {
        latitudes.push(coordinate.lat);
        longitudes.push(coordinate.lng);
      });
    });

    if (latitudes.length === 0) {
      return null;
    }

    return {
      minLat: Math.min(...latitudes),
      maxLat: Math.max(...latitudes),
      minLng: Math.min(...longitudes),
      maxLng: Math.max(...longitudes),
    };
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
  public canAdd(): boolean {
    return RoutePicker.isSupported();
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

      const routeId = await this.dispatcher.addRoute(
        this.bagId,
        draft,
        picked.uri
      );

      app.getAnalyticsManager()?.logClick('bag_route_upload', {
        distance: Math.round(parsed.distance),
        point_count: parsed.pointCount,
      });
      await this.load(true);
      // 방금 올린 코스를 바로 보여준다 — 지도·그래프가 그 코스로 옮겨간다.
      this.selectEntry(`bag:${routeId}`);

      return true;
    } catch (error) {
      this.showMessage(getRouteErrorMessage(error));

      return false;
    } finally {
      this.setSubmitting(false);
    }
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
      await this.dispatcher.copyToGroup(groupId, route);
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
      const groupRoutes = await this.loadGroupRoutes(linkedGroups);

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

  private async loadGroupRoutes(groups: Group[]): Promise<LinkedGroupRoute[]> {
    const loaded = await Promise.all(
      groups.map(async group => {
        try {
          const routes = await this.dispatcher.getGroupRoutes(group.getId());

          return routes.map(route => ({ groupName: group.getName(), route }));
        } catch (error) {
          // 내보내진 그룹의 역인덱스가 남아 있는 경우 등. 나머지 그룹을 막지 않는다.
          console.warn('[BagRouteList] 그룹 코스 조회 실패', error); // l10n-ignore: 개발자 로그

          return [] as LinkedGroupRoute[];
        }
      })
    );

    return loaded.flat();
  }

  // 선택이 없거나 사라진 코스를 가리키고 있으면 첫 코스로 되돌린다(그룹 지도와 같은 규칙).
  private syncSelection() {
    const entries = this.getEntries();

    if (entries.length === 0) {
      this.selectedKey = null;

      return;
    }

    if (!entries.some(entry => entry.key === this.selectedKey)) {
      this.selectedKey = entries[0].key;
    }
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
