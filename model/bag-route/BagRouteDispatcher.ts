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
      RouteUpload.from(app.getFirebase())
    );
  }

  private constructor(
    private readonly bagRouteStore: BagRouteStore,
    private readonly groupStore: GroupStore,
    private readonly groupRouteDispatcher: GroupRouteDispatcher,
    private readonly upload: RouteUpload
  ) {}

  public getRoutes(bagId: string): Promise<BagRoute[]> {
    return this.bagRouteStore.getRoutes(bagId);
  }

  // 이 배낭을 연결한 그룹(BD-11). 없으면 `그룹에 올리기`와 그룹 코스 표시가 함께 사라진다.
  public getLinkedGroups(bagId: string): Promise<Group[]> {
    return this.groupStore.getGroupsByBag(bagId);
  }

  public getGroupRoutes(groupId: string): Promise<GroupRoute[]> {
    return this.groupStore.getRoutes(groupId);
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
  public async copyToGroup(groupId: string, route: BagRoute): Promise<string> {
    const downloadUrl = await this.upload.getDownloadUrl(
      route.getStoragePath()
    );

    return this.groupRouteDispatcher.addRoute(
      groupId,
      route.toDraft(),
      downloadUrl
    );
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
