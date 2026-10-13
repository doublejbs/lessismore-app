import app from '@/model/app/App';
import BagPoint from '@/model/bag-point/BagPoint';
import Group from '@/model/group/Group';
import GroupPoint from '@/model/group/GroupPoint';
import { PointInput, PointPatch } from '@/model/point/PointData';
import BagPointStore from '@/model/store/BagPointStore';
import GroupStore from '@/model/store/GroupStore';
import NetworkStatus from '@/model/offline/NetworkStatus';
import OfflineTripAccess from '@/model/offline/OfflineTripAccess';
import {
  fromOfflineGroupPointData,
  fromOfflinePointData,
  OfflineTripSnapshotData,
} from '@/model/offline/OfflineTripSnapshot';
import OfflineTripStore from '@/model/offline/OfflineTripStore';

// 연결 그룹에서 온 포인트 한 건. 그룹 이름을 함께 들고 있어야 카드·목록에 출처를 적을 수 있다(BD-14).
export interface LinkedGroupPoint {
  groupId: string;
  groupName: string;
  point: GroupPoint;
}

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

    const snapshot = await this.loadOfflineSnapshot(bagId);

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

  // 이 배낭을 연결한 그룹(BD-14). 오프라인이면 없는 것으로 본다 — 그룹 포인트는
  // `getLinkedGroupPoints`가 저장본에서 따로 읽는다(OF-1 2026-10-13).
  public async getLinkedGroups(bagId: string): Promise<Group[]> {
    if (this.networkStatus.isOffline()) {
      return [];
    }

    return this.groupStore.getGroupsByBag(bagId);
  }

  /**
   * 연결 그룹의 포인트(읽기 전용, BD-14). 온라인이면 그룹마다 읽고(한 그룹이 실패해도 나머지는 보인다),
   * 오프라인이면 저장본의 그룹 포인트(OF-1 2026-10-13)를 같은 모델로 되돌린다 — 온라인과 같은 목록이 된다.
   */
  public async getLinkedGroupPoints(
    bagId: string,
    groups: Group[]
  ): Promise<LinkedGroupPoint[]> {
    if (this.networkStatus.isOffline()) {
      const snapshot = await this.loadOfflineSnapshot(bagId);

      return (snapshot?.groupPoints ?? []).map(point => ({
        groupId: point.groupId,
        groupName: point.groupName,
        point: GroupPoint.from(fromOfflineGroupPointData(point)),
      }));
    }

    const loaded = await Promise.all(
      groups.map(async group => {
        try {
          const points = await this.groupStore.getPoints(group.getId());

          return points.map(point => ({
            groupId: group.getId(),
            groupName: group.getName(),
            point,
          }));
        } catch (error) {
          // 내보내진 그룹의 역인덱스가 남아 있는 경우 등. 나머지 그룹을 막지 않는다.
          console.warn('[BagPointDispatcher] 그룹 포인트 조회 실패', error); // l10n-ignore: 개발자 로그

          return [] as LinkedGroupPoint[];
        }
      })
    );

    return loaded.flat();
  }

  // 열 수 있는 저장본(OF-6). 저장하지 않았거나 열 수 없으면(권한·구버전) `null` — 빈 목록이 된다.
  private async loadOfflineSnapshot(
    bagId: string
  ): Promise<OfflineTripSnapshotData | null> {
    const store = this.offlineTripStore;

    if (!store || store.getAccess(bagId) !== OfflineTripAccess.Available) {
      return null;
    }

    return store.load(bagId);
  }
}

export default BagPointDispatcher;
