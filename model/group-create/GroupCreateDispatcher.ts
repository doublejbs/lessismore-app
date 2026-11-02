import app from '@/model/app/App';
import BagItem from '@/model/bag/BagItem';
import Group from '@/model/group/Group';
import { GroupCreateInput } from '@/model/group/GroupData';
import BagStore from '@/model/store/BagStore';
import GroupStore from '@/model/store/GroupStore';

// 그룹 만들기(GRP-2)가 쓰는 데이터 통로. 화면은 Firestore를 직접 알지 않는다.
class GroupCreateDispatcher {
  public static new() {
    return new GroupCreateDispatcher(app.getGroupStore()!, app.getBagStore()!);
  }

  private constructor(
    private readonly store: GroupStore,
    private readonly bagStore: BagStore
  ) {}

  public async createGroup(input: GroupCreateInput): Promise<string> {
    return await this.store.createGroup(input);
  }

  // 미리 채울 배낭 (GRP-13). 본인 배낭이 아니면 null.
  public async getOwnedBag(bagId: string): Promise<BagItem | null> {
    return await this.bagStore.getOwnedBag(bagId);
  }

  public async getGroupsByBag(bagId: string): Promise<Group[]> {
    return await this.store.getGroupsByBag(bagId);
  }

  // GRP-5 연결과 같은 쓰기 — 공개용 스냅샷까지 함께 쓴다.
  public async linkBag(groupId: string, bagId: string): Promise<void> {
    await this.store.linkBag(groupId, bagId);
  }
}

export default GroupCreateDispatcher;
