import Group from './Group';
import { GroupPointData, toGroupDate } from './GroupData';
import GroupPointType from './GroupPointType';

// 그룹 지도 포인트 (GRP-9, DM-29 `groups/{groupId}/points/{pointId}`).
class GroupPoint {
  private readonly id: string;
  private readonly type: GroupPointType;
  private readonly latitude: number;
  private readonly longitude: number;
  private readonly title: string;
  private readonly description: string | undefined;
  private readonly authorId: string;
  private readonly authorName: string;
  private readonly createdAt: Date;

  public static from(data: GroupPointData) {
    return new GroupPoint(data);
  }

  public constructor(data: GroupPointData) {
    this.id = data.id;
    this.type = data.type;
    this.latitude = data.latitude;
    this.longitude = data.longitude;
    this.title = data.title;
    this.description = data.description;
    this.authorId = data.authorId;
    this.authorName = data.authorName;
    this.createdAt = toGroupDate(data.createdAt);
  }

  public getId() {
    return this.id;
  }

  public getType() {
    return this.type;
  }

  public getLatitude() {
    return this.latitude;
  }

  public getLongitude() {
    return this.longitude;
  }

  public getTitle() {
    return this.title;
  }

  public getDescription() {
    return this.description;
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

  // 올린 사람과 방장만 수정·삭제할 수 있다(GRP-4, GRP-9).
  public canEdit(uid: string, group: Group | null) {
    if (!uid) {
      return false;
    }

    return this.authorId === uid || !!group?.isOwner(uid);
  }
}

export default GroupPoint;
