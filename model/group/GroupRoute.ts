import { RouteElevationProfile } from '@/model/route/RouteElevation';
import { formatRouteDistance } from '@/model/route/RouteFormat';
import RouteDirectionStore from '@/model/route/RouteDirectionStore';
import RouteGeometry from '@/model/route/RouteGeometry';
import { RouteCoordinate, RouteDrawnPoint } from '@/model/route/RouteData';
import RouteSource from '@/model/route/RouteSource';
import Group from './Group';
import { toFirestoreDate } from '@/model/firebase/FirestoreDate';
import { RouteDisplay } from '@/model/route/RouteDisplay';
import { GroupRouteData } from './GroupData';

// 그룹 코스(GPX) 요약 (GRP-8, DM-29 `groups/{groupId}/routes/{routeId}`).
// 배낭 코스(`BagRoute`)와 같은 인터페이스를 만족해 지도·그래프·목록 행을 공유한다(BD-11).
class GroupRoute implements RouteDisplay {
  private readonly id: string;
  private readonly name: string;
  private readonly storagePath: string;
  private readonly distance: number;
  private readonly authorId: string;
  private readonly authorName: string;
  private readonly createdAt: Date;
  // 배낭 코스에서 복사해 온 코스면 그 원본(DM-29). 직접 올린 코스면 `null`.
  private readonly sourceBagId: string | null;
  private readonly sourceBagRouteId: string | null;
  // 그린 코스면 `Drawn`, 가져온 코스면 `null`(RouteDraw RD-7).
  private readonly source: RouteSource | null;
  private readonly drawnPoints: readonly RouteDrawnPoint[];
  /**
   * 방향에 따라 바뀌는 값(좌표 순서·고도 단면·상승) — 배낭 코스와 같은 구현을 쓴다(GRP-8 뒤집기).
   * 고도 단면은 방향별로 한 번만 만들어 들고 있는다 — 그래프를 훑는 동안 매 프레임 다시 만들지 않게.
   */
  private readonly geometry: RouteGeometry;

  /**
   * `directions`는 기기에 저장한 뒤집기 설정이다. 없으면(테스트·앱 초기화 전) 항상 원래 방향이다.
   */
  public static from(
    data: GroupRouteData,
    directions: RouteDirectionStore | null = null
  ) {
    return new GroupRoute(data, directions);
  }

  public constructor(
    data: GroupRouteData,
    directions: RouteDirectionStore | null = null
  ) {
    this.id = data.id;
    this.name = data.name;
    this.storagePath = data.storagePath;
    this.distance = data.distance;
    // 축약 좌표는 코스마다 500점까지 온다. 불변 값이라 복사하지 않고 그대로 넘긴다 —
    // 지도가 카메라를 움직일 때마다 이 배열을 읽으므로 복사·관찰 비용이 그대로 프레임에 실린다(GRP-8).
    this.geometry = RouteGeometry.from(
      {
        directionKey: data.storagePath || `groups/?/routes/${data.id}`,
        simplified: data.simplified,
        elevationGain: data.elevationGain,
        elevationLoss: data.elevationLoss,
      },
      directions
    );
    this.authorId = data.authorId;
    this.authorName = data.authorName;
    this.createdAt = toFirestoreDate(data.createdAt);
    this.sourceBagId = data.sourceBagId ?? null;
    this.sourceBagRouteId = data.sourceBagRouteId ?? null;
    this.source = data.source ?? null;
    this.drawnPoints = data.drawnPoints ?? [];
  }

  public getId() {
    return this.id;
  }

  public getName() {
    return this.name;
  }

  public getStoragePath() {
    return this.storagePath;
  }

  public getDirectionKey() {
    return this.geometry.getDirectionKey();
  }

  public isReversed() {
    return this.geometry.isReversed();
  }

  public toggleReversed() {
    this.geometry.toggleReversed();
  }

  // 지금 보는 방향의 상승. 뒤집혔으면 원래의 하강이다(GRP-8).
  public getElevationGain() {
    return this.geometry.getElevationGain();
  }

  // 지도가 렌더마다 부른다 — 사본을 만들지 않는다. 좌표는 읽기 전용으로만 쓴다(GRP-8, GRP-10).
  // 지금 보는 방향 순서다.
  public getSimplified() {
    return this.geometry.getSimplified();
  }

  // 코스를 고를 때 카메라를 맞추는 상자(GRP-8, BD-11). 방향과 무관하다.
  public getBounds() {
    return this.geometry.getBounds();
  }

  public getAuthorId() {
    return this.authorId;
  }

  public getAuthorName() {
    return this.authorName;
  }

  public getCreatedAt() {
    return this.createdAt;
  }

  // 지도에서 그린 코스인지(DM-29·DM-30 `source == 'drawn'`, RouteDraw RD-7). 그린 코스만 수정할 수 있다.
  public isDrawn(): boolean {
    return this.source === RouteSource.Drawn;
  }

  // 그린 코스의 찍은 점(수정 모드가 다시 연다, RD-7). 가져온 코스·찍은 점이 없는 문서면 빈 배열이다.
  public getDrawnPoints(): readonly RouteDrawnPoint[] {
    return this.drawnPoints;
  }

  // 저장된 방향 그대로의 축약 좌표(뒤집기와 무관) — 수정 모드가 찍은 점 위치로 잘라 구간을 되살린다(RD-7).
  public getStoredSimplified(): RouteCoordinate[] {
    return this.geometry.getStoredSimplified();
  }

  // 원본 배낭 코스(BD-11 중복 접기). `그룹에 올리기`로 복사한 코스에만 있다.
  public getSourceBagId(): string | null {
    return this.sourceBagId;
  }

  public getSourceBagRouteId(): string | null {
    return this.sourceBagRouteId;
  }

  // 원본 트랙 거리(m). 고도 그래프가 축약 거리를 이 값으로 환산해 표시한다(GRP-8).
  public getDistance() {
    return this.distance;
  }

  public getDistanceText() {
    return formatRouteDistance(this.distance);
  }

  /**
   * 고도 단면 (GRP-8). 고도가 없는 코스(이 기능 이전에 올라간 것 포함)는 `null`이고,
   * 그때 화면은 그래프를 그리지 않고 자리도 비운다.
   */
  public getElevationProfile(): RouteElevationProfile | null {
    return this.geometry.getElevationProfile();
  }

  // 그린 코스를 고칠 수 있는 사람 — **올린 사람만**(RD-7, 방장은 지우기만 한다). 권한(RD-8)은 따로 본다.
  public canRedraw(uid: string) {
    return !!uid && this.isDrawn() && this.authorId === uid;
  }

  // 올린 사람과 방장만 지울 수 있다(GRP-4, GRP-8).
  public canEdit(uid: string, group: Group | null) {
    if (!uid) {
      return false;
    }

    return this.authorId === uid || !!group?.isOwner(uid);
  }
}

export default GroupRoute;
