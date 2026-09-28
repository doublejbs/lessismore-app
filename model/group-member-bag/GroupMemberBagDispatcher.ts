import app from '@/model/app/App';
import Group from '@/model/group/Group';
import { GroupBagSnapshot } from '@/model/group/GroupData';
import GroupMember from '@/model/group/GroupMember';
import GroupStore from '@/model/store/GroupStore';

// 멤버 배낭 상세(GRP-5)는 읽기만 한다 — 원본 배낭(`bag/{bagId}`)에는 접근하지 않는다.
class GroupMemberBagDispatcher {
  public static new() {
    return new GroupMemberBagDispatcher(app.getGroupStore()!);
  }

  private constructor(private readonly groupStore: GroupStore) {}

  public getGroup(groupId: string): Promise<Group | null> {
    return this.groupStore.getGroup(groupId);
  }

  public getMembers(groupId: string): Promise<GroupMember[]> {
    return this.groupStore.getMembers(groupId);
  }

  public getMemberBags(groupId: string): Promise<GroupBagSnapshot[]> {
    return this.groupStore.getMemberBags(groupId);
  }

  public getUserId(): string {
    return app.getFirebase().getUserId();
  }
}

export default GroupMemberBagDispatcher;
