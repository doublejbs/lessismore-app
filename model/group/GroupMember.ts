import { makeAutoObservable } from 'mobx';
import { GroupMemberData, toGroupDate } from './GroupData';
import GroupMemberRole from './GroupMemberRole';

// 그룹 멤버 (GRP-4, DM-29 `groups/{groupId}/members/{uid}`).
class GroupMember {
  private readonly uid: string;
  private readonly nickname: string;
  private readonly role: GroupMemberRole;
  private readonly bagId: string | undefined;
  private readonly joinedAt: Date;

  public static from(data: GroupMemberData) {
    return new GroupMember(data);
  }

  public constructor(data: GroupMemberData) {
    this.uid = data.uid;
    this.nickname = data.nickname;
    this.role = data.role;
    this.bagId = data.bagId;
    this.joinedAt = toGroupDate(data.joinedAt);

    makeAutoObservable(this);
  }

  public getUid() {
    return this.uid;
  }

  public getNickname() {
    return this.nickname;
  }

  public getRole() {
    return this.role;
  }

  public getBagId() {
    return this.bagId;
  }

  public getJoinedAt() {
    return this.joinedAt;
  }

  public isOwner() {
    return this.role === GroupMemberRole.Owner;
  }

  public hasBag() {
    return !!this.bagId;
  }
}

export default GroupMember;
