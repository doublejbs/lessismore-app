import app from '@/model/app/App';
import { RouteDraft } from '@/model/route/RouteData';
import GroupRoute from '@/model/group/GroupRoute';
import RouteValidator from '@/model/route/RouteValidator';
import GroupStore from '@/model/store/GroupStore';
import RouteUpload from '@/model/route/RouteUpload';

/**
 * 코스(GRP-8)가 쓰는 데이터 접근. Firestore 문서와 Storage 원본을 **한 벌로** 다룬다 —
 * 둘을 따로 부르면 한쪽만 성공한 상태(고아 GPX·파일 없는 코스)를 만드는 호출자가 생긴다.
 */
class GroupRouteDispatcher {
  public static new() {
    return new GroupRouteDispatcher(
      app.getGroupStore()!,
      RouteUpload.from(app.getFirebase())
    );
  }

  private constructor(
    private readonly groupStore: GroupStore,
    private readonly upload: RouteUpload
  ) {}

  public getRoutes(groupId: string): Promise<GroupRoute[]> {
    return this.groupStore.getRoutes(groupId);
  }

  public getUserId(): string {
    return app.getFirebase().getUserId();
  }

  /**
   * 코스 등록. 순서가 계약이다 —
   * ① 규칙과 같은 조건으로 먼저 검증하고(안 하면 업로드만 성공하고 문서 쓰기가 거부돼
   * 회수 경로 없는 고아 GPX가 남는다) ② 문서 ID를 먼저 발급해 Storage 경로를 정한 뒤
   * ③ 원본을 올리고 ④ Firestore 문서를 쓴다. ④가 실패하면 ③을 되돌린다.
   */
  public async addRoute(
    groupId: string,
    draft: RouteDraft,
    localUri: string
  ): Promise<string> {
    RouteValidator.validateRoute(draft);

    const routeId = this.groupStore.createRouteId(groupId);
    const storagePath = this.groupStore.getRouteStoragePath(groupId, routeId);

    await this.upload.upload(storagePath, localUri);

    try {
      return await this.groupStore.createRoute(groupId, {
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
   * 코스 삭제. Firestore를 먼저 지운다 — 올린 사람·방장 판정이 그 트랜잭션에 있어서,
   * 파일을 먼저 지우면 권한 없는 삭제가 거부됐을 때 원본만 사라진 코스가 남는다.
   */
  public async deleteRoute(groupId: string, route: GroupRoute): Promise<void> {
    await this.groupStore.deleteRoute(groupId, route.getId());

    try {
      await this.upload.delete(route.getStoragePath());
    } catch (error) {
      // 문서가 이미 사라져 목록은 정확하다. 원본만 남은 것은 사용자가 손쓸 수 없는 일이라
      // 삭제 자체를 실패로 돌리지 않고 기록만 남긴다.
      console.warn('코스 원본 삭제 실패:', error); // l10n-ignore: 개발자 로그
    }
  }

  private async rollback(storagePath: string): Promise<void> {
    try {
      await this.upload.delete(storagePath);
    } catch (error) {
      console.warn('코스 원본 회수 실패:', error); // l10n-ignore: 개발자 로그
    }
  }
}

export default GroupRouteDispatcher;
