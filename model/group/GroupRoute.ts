import {
  buildRouteElevationProfile,
  RouteElevationProfile,
} from '@/model/route/RouteElevation';
import { formatRouteDistance } from '@/model/route/RouteFormat';
import Group from './Group';
import { RouteCoordinate } from '@/model/route/RouteData';
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
  private readonly elevationGain: number | undefined;
  private readonly simplified: RouteCoordinate[];
  private readonly authorId: string;
  private readonly authorName: string;
  private readonly createdAt: Date;
  // 고도 단면은 좌표 500점을 훑어 만든다 — 그래프를 훑는 동안 매 프레임 다시 만들지 않도록
  // 처음 물었을 때 한 번 만들어 들고 있는다(GRP-8). 좌표가 불변이라 값도 불변이다.
  private elevationProfile: RouteElevationProfile | null = null;
  private elevationProfileBuilt = false;

  public static from(data: GroupRouteData) {
    return new GroupRoute(data);
  }

  public constructor(data: GroupRouteData) {
    this.id = data.id;
    this.name = data.name;
    this.storagePath = data.storagePath;
    this.distance = data.distance;
    this.elevationGain = data.elevationGain;
    // 축약 좌표는 코스마다 500점까지 온다. 불변 값이라 복사하지 않고 그대로 들고 있는다 —
    // 지도가 카메라를 움직일 때마다 이 배열을 읽으므로 복사·관찰 비용이 그대로 프레임에 실린다(GRP-8).
    this.simplified = data.simplified;
    this.authorId = data.authorId;
    this.authorName = data.authorName;
    this.createdAt = toFirestoreDate(data.createdAt);
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

  public getElevationGain() {
    return this.elevationGain;
  }

  // 지도가 렌더마다 부른다 — 사본을 만들지 않는다. 좌표는 읽기 전용으로만 쓴다(GRP-8, GRP-10).
  public getSimplified() {
    return this.simplified;
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

  public getDistanceText() {
    return formatRouteDistance(this.distance);
  }

  /**
   * 고도 단면 (GRP-8). 고도가 없는 코스(이 기능 이전에 올라간 것 포함)는 `null`이고,
   * 그때 화면은 그래프를 그리지 않고 자리도 비운다.
   */
  public getElevationProfile(): RouteElevationProfile | null {
    if (!this.elevationProfileBuilt) {
      this.elevationProfileBuilt = true;
      this.elevationProfile = buildRouteElevationProfile(this.simplified);
    }

    return this.elevationProfile;
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
