import { makeAutoObservable } from 'mobx';
import Group from './Group';
import {
  GroupRouteBounds,
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
  private readonly fileSize: number;
  private readonly distance: number;
  private readonly elevationGain: number | undefined;
  private readonly pointCount: number;
  private readonly bounds: GroupRouteBounds;
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
    this.fileSize = data.fileSize;
    this.distance = data.distance;
    this.elevationGain = data.elevationGain;
    this.pointCount = data.pointCount;
    this.bounds = { ...data.bounds };
    this.simplified = data.simplified.map(coordinate => ({ ...coordinate }));
    this.authorId = data.authorId;
    this.authorName = data.authorName;
    this.createdAt = toGroupDate(data.createdAt);

    makeAutoObservable(this);
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

  public getFileSize() {
    return this.fileSize;
  }

  public getDistance() {
    return this.distance;
  }

  public getElevationGain() {
    return this.elevationGain;
  }

  public getPointCount() {
    return this.pointCount;
  }

  // 생성자가 방어 복사한 값을 원본째 내주지 않는다 — 사본을 돌려준다.
  public getBounds() {
    return { ...this.bounds };
  }

  public getSimplified() {
    return this.simplified.map(coordinate => ({ ...coordinate }));
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
