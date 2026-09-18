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
 * 그룹 상세의 코스 섹션이 쓴다. 파일 선택 → 파싱 → 업로드 → 목록 갱신이 한 흐름이라
 * 화면은 `addRoute()` 하나만 부르고 진행 상태는 `isSubmitting()`으로 본다.
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
   * 선택을 취소하면 아무 안내 없이 끝난다.
   */
  public async addRoute(): Promise<boolean> {
    if (this.submitting) {
      return false;
    }

    if (this.isFull()) {
      this.showMessage(
        getRouteErrorMessage(
          new GroupError(GroupValidationError.RouteLimitExceeded)
        )
      );

      return false;
    }

    try {
      const picked = await RoutePicker.pick();

      if (!picked) {
        return false;
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
      };

      await this.dispatcher.addRoute(this.groupId, draft, picked.uri);
      app.getAnalyticsManager()?.logClick('group_route_upload', {
        distance: Math.round(parsed.distance),
        point_count: parsed.pointCount,
      });
      await this.load(true);

      return true;
    } catch (error) {
      this.showMessage(getRouteErrorMessage(error));

      return false;
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
