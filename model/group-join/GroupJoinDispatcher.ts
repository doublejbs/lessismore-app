import app from '@/model/app/App';
import Firebase from '@/model/firebase/Firebase';
import Group from '@/model/group/Group';
import GroupStore from '@/model/store/GroupStore';

// 초대 수락(GRP-3)이 쓰는 데이터 통로.
class GroupJoinDispatcher {
  public static new() {
    return new GroupJoinDispatcher(app.getGroupStore()!, app.getFirebase());
  }

  private constructor(
    private readonly store: GroupStore,
    private readonly firebase: Firebase
  ) {}

  public getUserId(): string {
    return this.firebase.getUserId();
  }

  public async getGroup(groupId: string): Promise<Group | null> {
    return await this.store.getGroup(groupId);
  }

  public async joinGroup(groupId: string): Promise<void> {
    await this.store.joinGroup(groupId);
  }
}

export default GroupJoinDispatcher;
