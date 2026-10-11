import app from '@/model/app/App';
import BagPoint from '@/model/bag-point/BagPoint';
import Group from '@/model/group/Group';
import GroupPoint from '@/model/group/GroupPoint';
import { PointInput, PointPatch } from '@/model/point/PointData';
import BagPointStore from '@/model/store/BagPointStore';
import GroupStore from '@/model/store/GroupStore';
import NetworkStatus from '@/model/offline/NetworkStatus';
import OfflineTripAccess from '@/model/offline/OfflineTripAccess';
import { fromOfflinePointData } from '@/model/offline/OfflineTripSnapshot';
import OfflineTripStore from '@/model/offline/OfflineTripStore';

/**
 * 배낭 지도 포인트(BD-14)가 쓰는 데이터 접근. 배낭 포인트는 `BagPointStore`에, 연결 그룹의
 * 포인트(읽기 전용)는 `GroupStore`에 그대로 위임한다.
 */
class BagPointDispatcher {
  public static new() {
    return new BagPointDispatcher(
      app.getBagPointStore()!,
      app.getGroupStore()!,
      app.getNetworkStatus(),
      app.getOfflineTripStore()
    );
  }

  private constructor(
    private readonly bagPointStore: BagPointStore,
    private readonly groupStore: GroupStore,
    private readonly networkStatus: NetworkStatus,
    private readonly offlineTripStore: OfflineTripStore | null
  ) {}

  // 오프라인이면 저장본의 포인트(DM-33)를 같은 모델로 되돌린다(OF-6). 열 수 없는 저장본이면 빈 목록이다.
  public async getPoints(bagId: string): Promise<BagPoint[]> {
    if (!this.networkStatus.isOffline()) {
      return this.bagPointStore.getPoints(bagId);
    }

    const store = this.offlineTripStore;

    if (!store || store.getAccess(bagId) !== OfflineTripAccess.Available) {
      return [];
    }

    const snapshot = await store.load(bagId);

    return (snapshot?.points ?? []).map(point =>
      BagPoint.from(fromOfflinePointData(point))
    );
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
  // 그룹 포인트는 오프라인에 저장하지 않는다(OF-1) — 오프라인이면 연결 그룹이 없는 것으로 본다.
  public async getLinkedGroups(bagId: string): Promise<Group[]> {
    if (this.networkStatus.isOffline()) {
      return [];
    }

    return this.groupStore.getGroupsByBag(bagId);
  }

  public getGroupPoints(groupId: string): Promise<GroupPoint[]> {
    return this.groupStore.getPoints(groupId);
  }
}

export default BagPointDispatcher;
