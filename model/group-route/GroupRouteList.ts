import { makeAutoObservable, runInAction } from 'mobx';
import app from '@/model/app/App';
import Group from '@/model/group/Group';
import GroupError from '@/model/group/GroupError';
import GroupRoute from '@/model/group/GroupRoute';
import GroupValidationError from '@/model/group/GroupValidationError';
import RouteValidator from '@/model/route/RouteValidator';
import { RouteDraft } from '@/model/route/RouteData';
import { GROUP_MAX_ROUTE_COUNT } from '@/model/group/GroupLimits';
import GpxParser from '@/model/route/GpxParser';
import GroupRouteDispatcher from './GroupRouteDispatcher';
import { getRouteErrorMessage } from '@/model/route/RouteErrorMessage';
import RoutePicker from '@/model/route/RoutePicker';

const GPX_EXTENSION_PATTERN = /\.gpx$/i;

/**
 * 코스 목록 모델 (GRP-8).
 *
 * 그룹 지도가 쓴다(GRP-10) — 지도 선·고도 그래프·바텀 시트 목록·`코스 추가`가 **이 목록 하나**를
 * 본다(`GroupMap`이 들고 있다). 그룹 상세의 지도 밴드도 같은 모델로 따로 읽는다(GRP-7).
 * 파일 선택 → 파싱 → 업로드 → 목록 갱신이 한 흐름이라 화면은 `addRoute()` 하나만 부르고
 * 진행 상태는 `isSubmitting()`으로 본다.
 */
class GroupRouteList {
  private routes: GroupRoute[] = [];
  private loading = false;
  private initialized = false;
  private submitting = false;
  private error: Error | null = null;

  public static from(dispatcher: GroupRouteDispatcher, groupId: string) {
    return new GroupRouteList(dispatcher, groupId);
  }

  private constructor(
    private readonly dispatcher: GroupRouteDispatcher,
    private readonly groupId: string
  ) {
    makeAutoObservable(this);
  }

  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.load(false);
  }

  public async refresh(quiet = false): Promise<void> {
    await this.load(quiet);
  }

  public getGroupId(): string {
    return this.groupId;
  }

  public getRoutes(): GroupRoute[] {
    return this.routes;
  }

  public getCount(): number {
    return this.routes.length;
  }

  // 상한 5개 (GRP-8). 화면은 이 값으로 `코스 추가`를 막고 안내를 띄운다.
  public isFull(): boolean {
    return this.routes.length >= GROUP_MAX_ROUTE_COUNT;
  }

  public isLoading(): boolean {
    return this.loading;
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public isSubmitting(): boolean {
    return this.submitting;
  }

  public getError(): Error | null {
    return this.error;
  }

  public getUserId(): string {
    return this.dispatcher.getUserId();
  }

  // 파일 선택기가 없는 환경(웹)에서는 추가 액션 자체를 그리지 않는다(APP-5).
  public canAdd(): boolean {
    return RoutePicker.isSupported();
  }

  // 올린 사람과 방장만 지운다 (GRP-4 · GRP-8).
  public canDelete(route: GroupRoute, group: Group | null): boolean {
    return route.canEdit(this.getUserId(), group);
  }

  /**
   * 코스 추가 — 파일 선택 → 용량 검사 → 파싱 → 업로드 → Firestore → 목록 갱신 (GRP-8).
   * 선택을 취소하면 아무 안내 없이 끝난다. 올린 코스의 ID를 돌려준다(실패·취소면 `null`) —
   * 지도가 방금 올린 코스를 골라 카메라를 옮긴다.
   */
  public async addRoute(): Promise<string | null> {
    if (this.submitting) {
      return null;
    }

    if (this.isFull()) {
      this.showMessage(
        getRouteErrorMessage(
          new GroupError(GroupValidationError.RouteLimitExceeded)
        )
      );

      return null;
    }

    try {
      const picked = await RoutePicker.pick();

      if (!picked) {
        return null;
      }

      this.setSubmitting(true);

      // 용량은 파일을 읽기 전에 본다 — 5MB를 다 읽고 거절하면 그만큼이 헛일이다.
      GpxParser.validateFileSize(picked.size);

      const parsed = GpxParser.parse(await RoutePicker.readText(picked.uri));
      const draft: RouteDraft = {
        // 트랙 이름이 있으면 그것을, 없으면 파일명을 쓴다(GRP-8). 40자 절단은 검증기가 한다.
        name: RouteValidator.toRouteName(
          parsed.name || picked.name.replace(GPX_EXTENSION_PATTERN, '')
        ),
        fileSize: picked.size,
        distance: parsed.distance,
        pointCount: parsed.pointCount,
        bounds: parsed.bounds,
        simplified: parsed.simplified,
        // 고도가 하나도 없는 파일에는 키를 넣지 않는다 — 0을 넣으면 "상승 0m"로 읽힌다.
        ...(parsed.elevationGain !== null
          ? { elevationGain: parsed.elevationGain }
          : {}),
        // 하강도 같은 규칙이다 — 뒤집어 볼 때의 상승이 이 값이다(GRP-8).
        ...(parsed.elevationLoss !== null
          ? { elevationLoss: parsed.elevationLoss }
          : {}),
      };

      return await this.submitDraft(draft, picked.uri);
    } catch (error) {
      this.showMessage(getRouteErrorMessage(error));

      return null;
    } finally {
      this.setSubmitting(false);
    }
  }

  /**
   * 지도에서 그린 코스를 올린다 (RD-3). 파일은 이미 만들어져 있다 — 그 뒤는 가져오기와 **같은 경로**다
   * (디스패처 검증·업로드·상한 검사, `click_group_route_upload`, 목록 갱신). 올린 코스 id를 돌려준다(실패면 `null` —
   * 가져오기와 같은 문구로 이미 알렸다). 고르고 카메라를 맞추는 일은 그리기 모드를 나간 뒤 화면이 한다
   * (`RouteDrawHost.onSaved`). `routeId`는 그리기가 미리 발급한 id다(무료 1회를 그 id로 정했다 — RD-8).
   */
  public async addDrawnRoute(
    draft: RouteDraft,
    localUri: string,
    routeId: string
  ): Promise<string | null> {
    if (this.submitting) {
      return null;
    }

    if (this.isFull()) {
      this.showMessage(
        getRouteErrorMessage(
          new GroupError(GroupValidationError.RouteLimitExceeded)
        )
      );

      return null;
    }

    this.setSubmitting(true);

    try {
      return await this.submitDraft(draft, localUri, routeId);
    } catch (error) {
      this.showMessage(getRouteErrorMessage(error));

      return null;
    } finally {
      this.setSubmitting(false);
    }
  }

  /**
   * 그린 코스를 올릴 수 있는지 미리 본다(RD-8 저장 전 검사) — 막히면 사유 문구, 통과면 `null`. `addDrawnRoute`가
   * 같은 조건으로 거절하므로, 무료 1회 기록 전에 이것을 먼저 보게 한다.
   */
  public getDrawSubmitBlockReason(): string | null {
    if (this.isFull()) {
      return getRouteErrorMessage(
        new GroupError(GroupValidationError.RouteLimitExceeded)
      );
    }

    return null;
  }

  // 새로 그릴 코스의 문서 id(RD-8 — 무료 1회를 업로드 전에 이 id로 정한다).
  public createRouteId(): string {
    return this.dispatcher.createRouteId(this.groupId);
  }

  // 그린 코스를 고칠 수 있는 사람인지 — 올린 사람만(RD-7). 권한(RD-8)은 그리기 모델이 따로 본다.
  public canRedraw(route: GroupRoute): boolean {
    return this.canAdd() && route.canRedraw(this.getUserId());
  }

  /**
   * 그린 코스를 고친 것을 올린다 (RD-7) — 같은 문서·같은 Storage 경로를 덮어쓴다. 상한은 보지 않는다(개수가 그대로다).
   * 코스가 하나 늘지 않았으므로 `click_group_route_upload`는 남기지 않는다. 실패하면 같은 문구로 알리고 `null`.
   */
  public async updateDrawnRoute(
    routeId: string,
    draft: RouteDraft,
    localUri: string
  ): Promise<string | null> {
    if (this.submitting) {
      return null;
    }

    this.setSubmitting(true);

    try {
      await this.dispatcher.updateRoute(this.groupId, routeId, draft, localUri);
      await this.load(true);

      return routeId;
    } catch (error) {
      this.showMessage(getRouteErrorMessage(error));

      return null;
    } finally {
      this.setSubmitting(false);
    }
  }

  public async deleteRoute(route: GroupRoute): Promise<boolean> {
    if (this.submitting) {
      return false;
    }

    this.setSubmitting(true);

    try {
      await this.dispatcher.deleteRoute(this.groupId, route);
      await this.load(true);

      return true;
    } catch (error) {
      this.showMessage(getRouteErrorMessage(error));

      return false;
    } finally {
      this.setSubmitting(false);
    }
  }

  // 올리기 + 측정 + 목록 갱신 — 가져오기(`addRoute`)와 그리기(`addDrawnRoute`)가 함께 쓴다. 올린 코스 id를 돌려준다.
  private async submitDraft(
    draft: RouteDraft,
    localUri: string,
    presetRouteId: string | null = null
  ) {
    const routeId = await this.dispatcher.addRoute(
      this.groupId,
      draft,
      localUri,
      null,
      presetRouteId
    );

    app.getAnalyticsManager()?.logClick('group_route_upload', {
      distance: Math.round(draft.distance),
      point_count: draft.pointCount,
    });
    await this.load(true);

    return routeId;
  }

  private async load(quiet: boolean) {
    if (!quiet) {
      this.setLoading(true);
    }

    this.setError(null);

    try {
      const routes = await this.dispatcher.getRoutes(this.groupId);

      runInAction(() => {
        this.routes = routes;
      });
    } catch (error) {
      this.setError(error as Error);
    } finally {
      runInAction(() => {
        this.loading = false;
        this.initialized = true;
      });
    }
  }

  private showMessage(message: string) {
    app.getToastManager()?.showSimple(message);
  }

  private setLoading(value: boolean) {
    this.loading = value;
  }

  private setSubmitting(value: boolean) {
    this.submitting = value;
  }

  private setError(value: Error | null) {
    this.error = value;
  }
}

export default GroupRouteList;
