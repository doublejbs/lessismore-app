import app from '@/model/app/App';
import { CampSpot } from '@/model/camp-site/CampSpotTypes';
import Group from '@/model/group/Group';
import GroupRoute from '@/model/group/GroupRoute';
import CampSpotStore from '@/model/store/CampSpotStore';
import GroupStore from '@/model/store/GroupStore';

// 그룹 지도(GRP-10)가 쓰는 데이터 접근. 포인트는 `GroupPointDispatcher`가 따로 맡는다.
class GroupMapDispatcher {
  public static new() {
    return new GroupMapDispatcher(app.getGroupStore()!, app.getCampSpotStore()!);
  }

  private constructor(
    private readonly groupStore: GroupStore,
    private readonly campSpotStore: CampSpotStore
  ) {}

  public getGroup(groupId: string): Promise<Group | null> {
    return this.groupStore.getGroup(groupId);
  }

  // 코스는 읽기만 한다 — GPX 파싱·업로드·삭제는 코스 화면 몫이다(GRP-8).
  public getRoutes(groupId: string): Promise<GroupRoute[]> {
    return this.groupStore.getRoutes(groupId);
  }

  public getCampSpot(campSpotId: string): Promise<CampSpot | null> {
    return this.campSpotStore.getSpot(campSpotId);
  }

  public getUserId(): string {
    return app.getFirebase().getUserId();
  }
}

export default GroupMapDispatcher;
