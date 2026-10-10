import app from '@/model/app/App';
import BagPoint from '@/model/bag-point/BagPoint';
import Group from '@/model/group/Group';
import GroupPoint from '@/model/group/GroupPoint';
import { PointInput, PointPatch } from '@/model/point/PointData';
import BagPointStore from '@/model/store/BagPointStore';
import GroupStore from '@/model/store/GroupStore';

/**
 * 배낭 지도 포인트(BD-14)가 쓰는 데이터 접근. 배낭 포인트는 `BagPointStore`에, 연결 그룹의
 * 포인트(읽기 전용)는 `GroupStore`에 그대로 위임한다.
 */
class BagPointDispatcher {
  public static new() {
    return new BagPointDispatcher(
      app.getBagPointStore()!,
      app.getGroupStore()!
    );
  }

  private constructor(
    private readonly bagPointStore: BagPointStore,
    private readonly groupStore: GroupStore
  ) {}

  public getPoints(bagId: string): Promise<BagPoint[]> {
    return this.bagPointStore.getPoints(bagId);
  }

  public createPoint(bagId: string, input: PointInput): Promise<string> {
    return this.bagPointStore.createPoint(bagId, input);
  }

  public updatePoint(
    bagId: string,
    pointId: string,
    patch: PointPatch
  ): Promise<void> {
    return this.bagPointStore.updatePoint(bagId, pointId, patch);
  }

  public deletePoint(bagId: string, pointId: string): Promise<void> {
    return this.bagPointStore.deletePoint(bagId, pointId);
  }

  // 이 배낭을 연결한 그룹(BD-14). 없으면 그룹 포인트 표시가 사라진다.
  public getLinkedGroups(bagId: string): Promise<Group[]> {
    return this.groupStore.getGroupsByBag(bagId);
  }

  public getGroupPoints(groupId: string): Promise<GroupPoint[]> {
    return this.groupStore.getPoints(groupId);
  }
}

export default BagPointDispatcher;
