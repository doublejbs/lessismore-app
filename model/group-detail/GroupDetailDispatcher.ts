import app from '@/model/app/App';
import BagItem from '@/model/bag/BagItem';
import { CampSpot } from '@/model/camp-site/CampSpotTypes';
import Group from '@/model/group/Group';
import { GroupBagSnapshot } from '@/model/group/GroupData';
import GroupMember from '@/model/group/GroupMember';
import BagStore from '@/model/store/BagStore';
import CampSpotStore from '@/model/store/CampSpotStore';
import GroupStore from '@/model/store/GroupStore';

// 그룹 상세(GRP-4·GRP-5·GRP-7)가 쓰는 데이터 접근을 한곳에 모은다.
class GroupDetailDispatcher {
  public static new() {
    return new GroupDetailDispatcher(
      app.getGroupStore()!,
      app.getBagStore()!,
      app.getCampSpotStore()!
    );
  }

  private constructor(
    private readonly groupStore: GroupStore,
    private readonly bagStore: BagStore,
    private readonly campSpotStore: CampSpotStore
  ) {}

  public getGroup(groupId: string): Promise<Group | null> {
    return this.groupStore.getGroup(groupId);
  }

  public getMembers(groupId: string): Promise<GroupMember[]> {
    return this.groupStore.getMembers(groupId);
  }

  public getMemberBags(groupId: string): Promise<GroupBagSnapshot[]> {
    return this.groupStore.getMemberBags(groupId);
  }

  public getCampSpot(campSpotId: string): Promise<CampSpot | null> {
    return this.campSpotStore.getSpot(campSpotId);
  }

  public getMyGroups(): Promise<Group[]> {
    return this.groupStore.getMyGroups();
  }

  public getMyBags(): Promise<BagItem[]> {
    return this.bagStore.getList();
  }

  public unlinkBag(groupId: string): Promise<void> {
    return this.groupStore.unlinkBag(groupId);
  }

  public syncMyBagSnapshot(groupId: string): Promise<void> {
    return this.groupStore.syncMyBagSnapshot(groupId);
  }

  public setInviteEnabled(groupId: string, enabled: boolean): Promise<void> {
    return this.groupStore.setInviteEnabled(groupId, enabled);
  }

  public removeMember(groupId: string, uid: string): Promise<void> {
    return this.groupStore.removeMember(groupId, uid);
  }

  public leaveGroup(groupId: string): Promise<void> {
    return this.groupStore.leaveGroup(groupId);
  }

  public deleteGroup(groupId: string): Promise<void> {
    return this.groupStore.deleteGroup(groupId);
  }

  public getUserId(): string {
    return app.getFirebase().getUserId();
  }
}

export default GroupDetailDispatcher;
