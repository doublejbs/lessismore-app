import app from '@/model/app/App';
import BagRoute from '@/model/bag-route/BagRoute';
import Group from '@/model/group/Group';
import GroupRoute from '@/model/group/GroupRoute';
import GroupRouteDispatcher from '@/model/group-route/GroupRouteDispatcher';
import { RouteDraft } from '@/model/route/RouteData';
import RouteUpload from '@/model/route/RouteUpload';
import RouteValidator from '@/model/route/RouteValidator';
import BagRouteStore from '@/model/store/BagRouteStore';
import GroupStore from '@/model/store/GroupStore';
import NetworkStatus from '@/model/offline/NetworkStatus';
import OfflineTripAccess from '@/model/offline/OfflineTripAccess';
import {
  fromOfflineGroupRouteData,
  fromOfflineRouteData,
  OfflineTripSnapshotData,
} from '@/model/offline/OfflineTripSnapshot';
import OfflineTripStore from '@/model/offline/OfflineTripStore';

// 연결 그룹에서 온 코스 한 건. 그룹 이름을 함께 들고 있어야 목록에 출처를 적을 수 있다(BD-11).
export interface LinkedGroupRoute {
  groupName: string;
  route: GroupRoute;
}

/**
 * 배낭 코스(BD-11)가 쓰는 데이터 접근. Firestore 문서와 Storage 원본을 **한 벌로** 다룬다 —
 * 둘을 따로 부르면 한쪽만 성공한 상태(고아 GPX·파일 없는 코스)를 만드는 호출자가 생긴다.
 *
 * 그룹 쪽 일(연결 그룹 조회·그룹에 복사)은 그룹 디스패처·스토어에 그대로 위임한다.
 */
class BagRouteDispatcher {
  public static new() {
    return new BagRouteDispatcher(
      app.getBagRouteStore()!,
      app.getGroupStore()!,
      GroupRouteDispatcher.new(),
      RouteUpload.from(app.getFirebase()),
      app.getNetworkStatus(),
      app.getOfflineTripStore()
    );
  }

  private constructor(
    private readonly bagRouteStore: BagRouteStore,
    private readonly groupStore: GroupStore,
    private readonly groupRouteDispatcher: GroupRouteDispatcher,
    private readonly upload: RouteUpload,
    private readonly networkStatus: NetworkStatus,
    private readonly offlineTripStore: OfflineTripStore | null
  ) {}

  /**
   * 코스 목록. 오프라인이면 저장본의 코스(DM-30 문서 그대로)를 같은 모델로 되돌린다(OF-6) — 축약 좌표·고도가
   * 문서 안에 있어 오프라인 지도·고도 그래프가 그대로 그려진다. 열 수 없는 저장본이면 빈 목록이다.
   */
  public async getRoutes(bagId: string): Promise<BagRoute[]> {
    if (!this.networkStatus.isOffline()) {
      return this.bagRouteStore.getRoutes(bagId);
    }

    const snapshot = await this.loadOfflineSnapshot(bagId);

    return (snapshot?.routes ?? []).map(route =>
      this.bagRouteStore.toRoute(fromOfflineRouteData(route))
    );
  }

  // 이 배낭을 연결한 그룹(BD-11). 없으면 `그룹에 올리기`가 사라진다.
  // 오프라인이면 연결 그룹이 없는 것으로 본다 — 그룹에 올리기는 온라인 전용이고(OF-5), 그룹 코스는
  // `getLinkedGroupRoutes`가 저장본에서 따로 읽는다.
  public async getLinkedGroups(bagId: string): Promise<Group[]> {
    if (this.networkStatus.isOffline()) {
      return [];
    }

    return this.groupStore.getGroupsByBag(bagId);
  }

  /**
   * 연결 그룹의 코스(읽기 전용, BD-11). 온라인이면 `groups`의 코스를 그룹마다 읽고(한 그룹이 실패해도
   * 나머지는 보인다), 오프라인이면 저장본의 그룹 코스(OF-1 2026-10-13)를 같은 모델로 되돌린다 —
   * 온라인과 같은 목록이 된다.
   */
  public async getLinkedGroupRoutes(
    bagId: string,
    groups: Group[]
  ): Promise<LinkedGroupRoute[]> {
    if (this.networkStatus.isOffline()) {
      const snapshot = await this.loadOfflineSnapshot(bagId);

      return (snapshot?.groupRoutes ?? []).map(route => ({
        groupName: route.groupName,
        route: this.groupStore.toRoute(fromOfflineGroupRouteData(route)),
      }));
    }

    const loaded = await Promise.all(
      groups.map(async group => {
        try {
          const routes = await this.groupStore.getRoutes(group.getId());

          return routes.map(route => ({ groupName: group.getName(), route }));
        } catch (error) {
          // 내보내진 그룹의 역인덱스가 남아 있는 경우 등. 나머지 그룹을 막지 않는다.
          console.warn('[BagRouteDispatcher] 그룹 코스 조회 실패', error); // l10n-ignore: 개발자 로그

          return [] as LinkedGroupRoute[];
        }
      })
    );

    return loaded.flat();
  }

  /**
   * 코스 등록. 순서가 계약이다(그룹 코스 GRP-8과 같다) —
   * ① 규칙과 같은 조건으로 먼저 검증하고(안 하면 업로드만 성공하고 문서 쓰기가 거부돼
   * 회수 경로 없는 고아 GPX가 남는다) ② 문서 ID를 먼저 발급해 Storage 경로를 정한 뒤
   * ③ 원본을 올리고 ④ Firestore 문서를 쓴다. ④가 실패하면 ③을 되돌린다.
   */
  public async addRoute(
    bagId: string,
    draft: RouteDraft,
    localUri: string
  ): Promise<string> {
    RouteValidator.validateRoute(draft);

    const routeId = this.bagRouteStore.createRouteId(bagId);
    const storagePath = this.bagRouteStore.getRouteStoragePath(bagId, routeId);

    await this.upload.upload(storagePath, localUri);

    try {
      return await this.bagRouteStore.createRoute(bagId, {
        ...draft,
        routeId,
        storagePath,
      });
    } catch (error) {
      await this.rollback(storagePath);

      throw error;
    }
  }

  /**
   * 코스 삭제. Firestore를 먼저 지운다 — 파일을 먼저 지우면 문서 삭제가 거부됐을 때
   * 원본만 사라진 코스가 남는다(그룹 코스와 같은 순서).
   */
  public async deleteRoute(bagId: string, route: BagRoute): Promise<void> {
    await this.bagRouteStore.deleteRoute(bagId, route.getId());

    try {
      await this.upload.delete(route.getStoragePath());
    } catch (error) {
      // 문서가 이미 사라져 목록은 정확하다. 원본만 남은 것은 사용자가 손쓸 수 없는 일이라
      // 삭제 자체를 실패로 돌리지 않고 기록만 남긴다.
      console.warn('배낭 코스 원본 삭제 실패:', error); // l10n-ignore: 개발자 로그
    }
  }

  /**
   * 내 코스를 그룹에 **복사**한다 (BD-11). 옮기는 것이 아니라 복사라 원본을 지워도 그룹 코스는
   * 남는다. 원본 GPX를 받아 그룹 경로에 **다시 올린다** — 축약 좌표만 옮기면 그룹 코스에
   * 원본 파일이 없는 상태가 되고, 그 코스는 나중에 내려받을 수도 옮길 수도 없다.
   *
   * 업로드 순서·상한 검사(그룹 5개)·고아 파일 회수는 **그룹 코스 등록 경로를 그대로 탄다** —
   * 그룹에 코스가 생기는 방법을 두 개 두지 않는다.
   */
  public async copyToGroup(
    bagId: string,
    groupId: string,
    route: BagRoute
  ): Promise<string> {
    const downloadUrl = await this.upload.getDownloadUrl(
      route.getStoragePath()
    );

    // 복사본에 원본 참조를 적는다(DM-29) — 배낭 코스 화면이 같은 코스를 두 번 보여 주지 않게(BD-11).
    return this.groupRouteDispatcher.addRoute(
      groupId,
      route.toDraft(),
      downloadUrl,
      { sourceBagId: bagId, sourceBagRouteId: route.getId() }
    );
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

  private async rollback(storagePath: string): Promise<void> {
    try {
      await this.upload.delete(storagePath);
    } catch (error) {
      console.warn('배낭 코스 원본 회수 실패:', error); // l10n-ignore: 개발자 로그
    }
  }
}

export default BagRouteDispatcher;
