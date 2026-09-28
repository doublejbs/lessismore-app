import { makeAutoObservable, runInAction } from 'mobx';
import { CampSpot } from '@/model/camp-site/CampSpotTypes';
import Group from '@/model/group/Group';
import GroupPoint from '@/model/group/GroupPoint';
import GroupRoute from '@/model/group/GroupRoute';
import GroupPointList from '@/model/group-point/GroupPointList';
import GroupRouteList from '@/model/group-route/GroupRouteList';
import {
  measureRouteBounds,
  mergeRouteBounds,
} from '@/model/route/RouteCamera';
import { RouteBounds } from '@/model/route/RouteData';
import GroupMapDispatcher from './GroupMapDispatcher';

/**
 * 코스를 **고른** 요청 (GRP-8). 지도가 이 요청마다 카메라를 그 코스로 옮긴다.
 * `seq`가 고를 때마다 올라가 이미 선택된 코스를 다시 골라도 새 요청이 된다.
 */
export interface GroupRouteFocusRequest {
  routeId: string;
  seq: number;
}

/**
 * 그룹 지도 화면 모델 (GRP-9 · GRP-10).
 *
 * 그룹 문서 · 연결된 박지를 읽고, 포인트는 `GroupPointList`에, 코스는 `GroupRouteList`에
 * 위임한다. 코스 목록은 **하나**다 — 지도 선·고도 그래프·코스 목록 시트·`코스 추가` 업로드가
 * 모두 이 목록을 봐서, 올리거나 지운 코스가 세 곳에 한꺼번에 반영된다(GRP-10).
 */
class GroupMap {
  private group: Group | null = null;
  private campSpot: CampSpot | null = null;
  private selectedRouteId: string | null = null;
  private routeFocusRequest: GroupRouteFocusRequest | null = null;
  private focusedPointId: string | null = null;
  private loading = false;
  private initialized = false;
  private error: Error | null = null;
  private notFound = false;
  private notMember = false;

  public static from(
    dispatcher: GroupMapDispatcher,
    pointList: GroupPointList,
    routeList: GroupRouteList,
    groupId: string
  ) {
    return new GroupMap(dispatcher, pointList, routeList, groupId);
  }

  private constructor(
    private readonly dispatcher: GroupMapDispatcher,
    private readonly pointList: GroupPointList,
    private readonly routeList: GroupRouteList,
    private readonly groupId: string
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

  public getGroupId(): string {
    return this.groupId;
  }

  public getGroup(): Group | null {
    return this.group;
  }

  public getPointList(): GroupPointList {
    return this.pointList;
  }

  public getRouteList(): GroupRouteList {
    return this.routeList;
  }

  public getRoutes(): GroupRoute[] {
    return this.routeList.getRoutes();
  }

  public getCampSpot(): CampSpot | null {
    return this.campSpot;
  }

  public getUserId(): string {
    return this.dispatcher.getUserId();
  }

  // 작성자 표시 파생에 쓰는 현재 멤버 목록(GRP-4). 그룹 문서의 `memberIds`가 단일 소스다.
  public getMemberIds(): string[] {
    return this.group?.getMemberIds() ?? [];
  }

  /**
   * 굵게 그릴 코스(GRP-10). 고른 코스가 없거나 목록에서 사라졌으면(지워짐) **첫 코스**다 —
   * 저장값이 아니라 목록에서 매번 읽는다. `코스 추가`·삭제는 `GroupRouteList`가 목록을 다시 읽으므로,
   * 선택을 저장값으로 두면 그때마다 되돌리는 처리를 목록 쪽에도 둬야 한다.
   */
  public getSelectedRouteId(): string | null {
    const routes = this.routeList.getRoutes();

    if (routes.some(route => route.getId() === this.selectedRouteId)) {
      return this.selectedRouteId;
    }

    return routes[0]?.getId() ?? null;
  }

  // 머리 줄·그래프·시작끝 마커가 가리키는 코스. 코스가 없으면 `null`이다.
  public getSelectedRoute(): GroupRoute | null {
    const selectedRouteId = this.getSelectedRouteId();

    return (
      this.routeList
        .getRoutes()
        .find(route => route.getId() === selectedRouteId) ?? null
    );
  }

  public selectRoute(routeId: string | null): void {
    this.selectedRouteId = routeId;
  }

  /**
   * 사용자가 코스를 고른다 — 코스 목록 시트의 행, 방금 올린 코스 (GRP-8 · GRP-10).
   * 선택에 더해 카메라 맞춤 요청을 남긴다. 첫 코스 자동 선택은 카메라를 옮기지 않는다.
   */
  public focusRoute(routeId: string): void {
    this.selectedRouteId = routeId;
    this.routeFocusRequest = {
      routeId,
      seq: (this.routeFocusRequest?.seq ?? 0) + 1,
    };
  }

  public getRouteFocusRequest(): GroupRouteFocusRequest | null {
    return this.routeFocusRequest;
  }

  public getFocusedPointId(): string | null {
    return this.focusedPointId;
  }

  public focusPoint(pointId: string | null): void {
    this.focusedPointId = pointId;
  }

  public getFocusedPoint(): GroupPoint | null {
    if (!this.focusedPointId) {
      return null;
    }

    return this.pointList.getPointById(this.focusedPointId);
  }

  public canEditPoint(point: GroupPoint): boolean {
    return point.canEdit(this.getUserId(), this.group);
  }

  public isLoading(): boolean {
    return this.loading;
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public getError(): Error | null {
    return this.error;
  }

  public isNotFound(): boolean {
    return this.notFound;
  }

  public isNotMember(): boolean {
    return this.notMember;
  }

  /**
   * 코스·포인트를 모두 담는 경계 상자 (GRP-10). 둘 다 없으면 `null`이고,
   * 그때 화면은 박지 위치 → 현재 위치 순으로 폴백한다.
   */
  public getContentBounds(): RouteBounds | null {
    return mergeRouteBounds([
      ...this.routeList.getRoutes().map(route => route.getBounds()),
      measureRouteBounds(
        this.pointList.getPoints().map(point => ({
          lat: point.getLatitude(),
          lng: point.getLongitude(),
        }))
      ),
    ]);
  }

  private async load(quiet: boolean) {
    if (!quiet) {
      this.setLoading(true);
    }

    this.setError(null);

    try {
      const group = await this.dispatcher.getGroup(this.groupId);

      if (!group) {
        runInAction(() => {
          this.group = null;
          this.notFound = true;
          this.notMember = false;
        });

        return;
      }

      if (!group.isMember(this.dispatcher.getUserId())) {
        runInAction(() => {
          this.group = null;
          this.notFound = false;
          this.notMember = true;
        });

        return;
      }

      const campSpotId = group.getCampSpotId();
      const [campSpot] = await Promise.all([
        campSpotId
          ? this.dispatcher.getCampSpot(campSpotId)
          : Promise.resolve(null),
        this.routeList.refresh(quiet),
        this.pointList.refresh(quiet),
      ]);
      // 코스 목록은 실패를 스스로 삼킨다. 코스를 못 읽은 지도를 정상처럼 보이지 않게,
      // 목록이 한곳이던 때와 같이 화면 전체의 조회 실패로 올린다.
      const routeError = this.routeList.getError();

      if (routeError) {
        throw routeError;
      }

      runInAction(() => {
        this.group = group;
        this.campSpot = campSpot;
        this.notFound = false;
        this.notMember = false;
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

  private setLoading(value: boolean) {
    this.loading = value;
  }

  private setError(value: Error | null) {
    this.error = value;
  }
}

export default GroupMap;
