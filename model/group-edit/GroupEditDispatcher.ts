import app from '@/model/app/App';
import { CampSpot } from '@/model/camp-site/CampSpotTypes';
import Group from '@/model/group/Group';
import { GroupPatch } from '@/model/group/GroupData';
import CampSpotStore from '@/model/store/CampSpotStore';
import GroupStore from '@/model/store/GroupStore';

// 그룹 정보 수정(GRP-7)이 쓰는 데이터 접근.
class GroupEditDispatcher {
  public static new() {
    return new GroupEditDispatcher(app.getGroupStore()!, app.getCampSpotStore()!);
  }

  private constructor(
    private readonly groupStore: GroupStore,
    private readonly campSpotStore: CampSpotStore
  ) {}

  public getGroup(groupId: string): Promise<Group | null> {
    return this.groupStore.getGroup(groupId);
  }

  public getCampSpot(campSpotId: string): Promise<CampSpot | null> {
    return this.campSpotStore.getSpot(campSpotId);
  }

  public updateGroup(groupId: string, patch: GroupPatch): Promise<void> {
    return this.groupStore.updateGroup(groupId, patch);
  }

  public getUserId(): string {
    return app.getFirebase().getUserId();
  }
}

export default GroupEditDispatcher;
