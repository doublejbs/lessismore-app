import Group from './Group';
import {
  GroupRouteCoordinate,
  GroupRouteData,
  toGroupDate,
} from './GroupData';

const METERS_IN_KILOMETER = 1000;

// 그룹 코스(GPX) 요약 (GRP-8, DM-29 `groups/{groupId}/routes/{routeId}`).
class GroupRoute {
  private readonly id: string;
  private readonly name: string;
  private readonly storagePath: string;
  private readonly distance: number;
  private readonly elevationGain: number | undefined;
  private readonly simplified: GroupRouteCoordinate[];
  private readonly authorId: string;
  private readonly authorName: string;
  private readonly createdAt: Date;

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
    this.createdAt = toGroupDate(data.createdAt);
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

  // 거리 표기: 1km 이상은 km 소수 첫째 자리, 미만은 m 정수. 단위는 숫자와 붙는 라틴 기호라 그대로 둔다.
  public getDistanceText() {
    if (this.distance >= METERS_IN_KILOMETER) {
      return `${(this.distance / METERS_IN_KILOMETER).toFixed(1)}km`;
    }

    return `${Math.round(this.distance)}m`;
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
