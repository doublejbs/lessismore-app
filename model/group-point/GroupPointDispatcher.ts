import app from '@/model/app/App';
import GroupPoint from '@/model/group/GroupPoint';
import { GroupPointInput, GroupPointPatch } from '@/model/group/GroupData';
import GroupStore from '@/model/store/GroupStore';

// 지도 포인트(GRP-9)가 쓰는 데이터 접근을 한곳에 모은다. 상세 섹션과 지도 화면이 함께 쓴다.
class GroupPointDispatcher {
  public static new() {
    return new GroupPointDispatcher(app.getGroupStore()!);
  }

  private constructor(private readonly groupStore: GroupStore) {}

  public getPoints(groupId: string): Promise<GroupPoint[]> {
    return this.groupStore.getPoints(groupId);
  }

  public createPoint(groupId: string, input: GroupPointInput): Promise<string> {
    return this.groupStore.createPoint(groupId, input);
  }

  public updatePoint(
    groupId: string,
    pointId: string,
    patch: GroupPointPatch
  ): Promise<void> {
    return this.groupStore.updatePoint(groupId, pointId, patch);
  }

  public deletePoint(groupId: string, pointId: string): Promise<void> {
    return this.groupStore.deletePoint(groupId, pointId);
  }

  public getUserId(): string {
    return app.getFirebase().getUserId();
  }
}

export default GroupPointDispatcher;
