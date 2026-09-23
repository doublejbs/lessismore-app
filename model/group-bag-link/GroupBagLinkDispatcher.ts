import app from '@/model/app/App';
import { CampSpot } from '@/model/camp-site/CampSpotTypes';
import Group from '@/model/group/Group';
import CampSpotStore from '@/model/store/CampSpotStore';
import GroupStore from '@/model/store/GroupStore';

// 배낭 ↔ 그룹 연결 흐름(GRP-5)이 쓰는 데이터 접근을 한곳에 모은다.
class GroupBagLinkDispatcher {
  public static new() {
    return new GroupBagLinkDispatcher(
      app.getGroupStore()!,
      app.getCampSpotStore()!
    );
  }

  private constructor(
    private readonly groupStore: GroupStore,
    private readonly campSpotStore: CampSpotStore
  ) {}

  public getGroupsByBag(bagId: string): Promise<Group[]> {
    return this.groupStore.getGroupsByBag(bagId);
  }

  public linkBag(groupId: string, bagId: string): Promise<void> {
    return this.groupStore.linkBag(groupId, bagId);
  }

  public unlinkBag(groupId: string): Promise<void> {
    return this.groupStore.unlinkBag(groupId);
  }

  public syncBagSnapshots(bagId: string): Promise<void> {
    return this.groupStore.syncBagSnapshots(bagId);
  }

  public getCampSpot(campSpotId: string): Promise<CampSpot | null> {
    return this.campSpotStore.getSpot(campSpotId);
  }
}

export default GroupBagLinkDispatcher;
