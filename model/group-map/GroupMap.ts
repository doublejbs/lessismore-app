import { makeAutoObservable, runInAction } from 'mobx';
import { CampSpot } from '@/model/camp-site/CampSpotTypes';
import Group from '@/model/group/Group';
import GroupPoint from '@/model/group/GroupPoint';
import GroupRoute from '@/model/group/GroupRoute';
import GroupPointList from '@/model/group-point/GroupPointList';
import GroupMapDispatcher from './GroupMapDispatcher';

// 코스·포인트를 모두 담는 경계 상자. 최초 카메라를 맞출 때 쓴다(GRP-10).
export interface GroupMapBounds {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
}

/**
 * 그룹 지도 화면 모델 (GRP-9 · GRP-10).
 *
 * 그룹 문서 · 코스 · 연결된 박지를 읽고, 포인트는 `GroupPointList`에 위임한다 —
 * 상세 화면의 포인트 섹션과 같은 모델을 써야 조회·상한 규칙이 갈리지 않는다.
 */
class GroupMap {
  private group: Group | null = null;
  private routes: GroupRoute[] = [];
  private campSpot: CampSpot | null = null;
  private selectedRouteId: string | null = null;
  private focusedPointId: string | null = null;
  private loading = false;
  private initialized = false;
  private error: Error | null = null;
  private notFound = false;
  private notMember = false;

  public static from(
    dispatcher: GroupMapDispatcher,
    pointList: GroupPointList,
    groupId: string
  ) {
    return new GroupMap(dispatcher, pointList, groupId);
  }

  private constructor(
    private readonly dispatcher: GroupMapDispatcher,
    private readonly pointList: GroupPointList,
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

  public getRoutes(): GroupRoute[] {
    return this.routes;
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

  public getSelectedRouteId(): string | null {
    return this.selectedRouteId;
  }

  public selectRoute(routeId: string | null): void {
    this.selectedRouteId = routeId;
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
  public getContentBounds(): GroupMapBounds | null {
    const latitudes: number[] = [];
    const longitudes: number[] = [];

    this.routes.forEach(route => {
      route.getSimplified().forEach(coordinate => {
        latitudes.push(coordinate.lat);
        longitudes.push(coordinate.lng);
      });
    });

    this.pointList.getPoints().forEach(point => {
      latitudes.push(point.getLatitude());
      longitudes.push(point.getLongitude());
    });

    if (latitudes.length === 0 || longitudes.length === 0) {
      return null;
    }

    return {
      minLatitude: Math.min(...latitudes),
      maxLatitude: Math.max(...latitudes),
      minLongitude: Math.min(...longitudes),
      maxLongitude: Math.max(...longitudes),
    };
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
      const [routes, campSpot] = await Promise.all([
        this.dispatcher.getRoutes(this.groupId),
        campSpotId
          ? this.dispatcher.getCampSpot(campSpotId)
          : Promise.resolve(null),
        this.pointList.refresh(quiet),
      ]);

      runInAction(() => {
        this.group = group;
        this.routes = routes;
        this.campSpot = campSpot;
        this.notFound = false;
        this.notMember = false;

        // 코스가 여럿이면 하나를 굵게 그린다(GRP-10). 선택이 없거나 지워진 코스를
        // 가리키고 있으면 첫 코스로 되돌린다.
        if (
          routes.length > 0 &&
          !routes.some(route => route.getId() === this.selectedRouteId)
        ) {
          this.selectedRouteId = routes[0].getId();
        }

        if (routes.length === 0) {
          this.selectedRouteId = null;
        }
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
