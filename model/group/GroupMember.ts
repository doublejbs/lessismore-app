import { GroupMemberData } from './GroupData';
import GroupMemberRole from './GroupMemberRole';

// 그룹 멤버 (GRP-4, DM-29 `groups/{groupId}/members/{uid}`).
class GroupMember {
  private readonly uid: string;
  private readonly nickname: string;
  private readonly role: GroupMemberRole;

  public static from(data: GroupMemberData) {
    return new GroupMember(data);
  }

  public constructor(data: GroupMemberData) {
    this.uid = data.uid;
    this.nickname = data.nickname;
    this.role = data.role;
  }

  public getUid() {
    return this.uid;
  }

  public getNickname() {
    return this.nickname;
  }

  public isOwner() {
    return this.role === GroupMemberRole.Owner;
  }
}

export default GroupMember;
