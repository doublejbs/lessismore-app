import app from '@/model/app/App';
import { GroupCreateInput } from '@/model/group/GroupData';
import GroupStore from '@/model/store/GroupStore';

// 그룹 만들기(GRP-2)가 쓰는 데이터 통로. 화면은 Firestore를 직접 알지 않는다.
class GroupCreateDispatcher {
  public static new() {
    return new GroupCreateDispatcher(app.getGroupStore()!);
  }

  private constructor(private readonly store: GroupStore) {}

  public async createGroup(input: GroupCreateInput): Promise<string> {
    return await this.store.createGroup(input);
  }
}

export default GroupCreateDispatcher;
