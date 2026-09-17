import app from '@/model/app/App';
import Group from '@/model/group/Group';
import GroupStore from '@/model/store/GroupStore';

// 그룹 목록(GRP-1)이 쓰는 데이터 통로. 화면은 Firestore를 직접 알지 않는다.
class GroupListDispatcher {
  public static new() {
    return new GroupListDispatcher(app.getGroupStore()!);
  }

  private constructor(private readonly store: GroupStore) {}

  public async getMyGroups(): Promise<Group[]> {
    return await this.store.getMyGroups();
  }
}

export default GroupListDispatcher;
