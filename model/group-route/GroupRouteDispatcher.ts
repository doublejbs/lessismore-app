import app from '@/model/app/App';
import { RouteDraft } from '@/model/route/RouteData';
import RouteDrawTargetKind from '@/model/route-draw/RouteDrawTargetKind';
import { GroupRouteSource } from '@/model/group/GroupData';
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

  // 코스 문서 id를 미리 발급한다 — 코스 그리기의 무료 1회(RD-8)가 업로드 전에 그 id로 기록을 정한다.
  public createRouteId(groupId: string): string {
    return this.groupStore.createRouteId(groupId);
  }

  /**
   * 코스 등록. 순서가 계약이다 —
   * ① 규칙과 같은 조건으로 먼저 검증하고(안 하면 업로드만 성공하고 문서 쓰기가 거부돼
   * 회수 경로 없는 고아 GPX가 남는다) ② 문서 ID를 먼저 발급해 Storage 경로를 정한 뒤
   * ③ 원본을 올리고 ④ Firestore 문서를 쓴다. ④가 실패하면 ③을 되돌린다.
   *
   * `source`는 배낭 코스를 복사해 올릴 때의 원본 참조다(DM-29 — BD-11 중복 접기). 직접 올리면 없다.
   * `presetRouteId`를 넘기면 그 id로 올린다(코스 그리기 무료 1회 — 미리 발급해 기록을 정한 id, RD-8).
   */
  public async addRoute(
    groupId: string,
    draft: RouteDraft,
    localUri: string,
    source: GroupRouteSource | null = null,
    presetRouteId: string | null = null
  ): Promise<string> {
    RouteValidator.validateRoute(draft);

    const routeId = presetRouteId ?? this.groupStore.createRouteId(groupId);
    const storagePath = this.groupStore.getRouteStoragePath(groupId, routeId);

    await this.upload.upload(storagePath, localUri);

    try {
      return await this.groupStore.createRoute(
        groupId,
        {
          ...draft,
          routeId,
          storagePath,
        },
        source
      );
    } catch (error) {
      await this.rollback(storagePath);

      throw error;
    }
  }

  /**
   * 그린 코스 수정 (RouteDraw RD-7). **같은 문서·같은 Storage 경로를 덮어쓴다**(배낭 코스와 같은 순서). 덮어쓰기 전에
   * 이전 원본을 받아 두고, 문서 쓰기가 실패하면(올린 사람이 아님·그린 코스가 아님 등) 그것을 다시 올려 이전
   * 파일·문서가 함께 남게 한다. 이전 원본을 못 받으면 덮어쓰지 않고 실패로 끝낸다.
   */
  public async updateRoute(
    groupId: string,
    routeId: string,
    draft: RouteDraft,
    localUri: string
  ): Promise<string> {
    RouteValidator.validateRoute(draft);

    const storagePath = this.groupStore.getRouteStoragePath(groupId, routeId);
    const previous = await this.upload.downloadBlob(storagePath);

    // 이전 원본을 못 받으면 덮어쓰지 않는다 — 문서 쓰기가 실패했을 때 되돌릴 것이 없어 파일·문서가 어긋난다.
    if (!previous) {
      throw new Error('Previous route GPX could not be downloaded');
    }

    await this.upload.upload(storagePath, localUri);

    try {
      return await this.groupStore.updateRoute(groupId, {
        ...draft,
        routeId,
        storagePath,
      });
    } catch (error) {
      await this.restore(storagePath, previous);

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

  // 문서 쓰기가 실패해 이전 원본을 다시 올린다. 이것마저 실패하면 파일·문서가 어긋난 채 남으므로 측정으로 남긴다.
  private async restore(storagePath: string, previous: Blob) {
    try {
      await this.upload.uploadBlob(storagePath, previous);
    } catch (error) {
      console.warn('코스 원본 되돌리기 실패:', error); // l10n-ignore: 개발자 로그
      app.getAnalyticsManager()?.logEvent('route_update_restore_failed', {
        kind: RouteDrawTargetKind.Group,
      });
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
