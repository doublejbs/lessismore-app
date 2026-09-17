import { makeAutoObservable, runInAction } from 'mobx';
import app from '@/model/app/App';
import GroupError from '@/model/group/GroupError';
import GroupPoint from '@/model/group/GroupPoint';
import GroupPointType from '@/model/group/GroupPointType';
import GroupValidationError from '@/model/group/GroupValidationError';
import { GroupPointInput, GroupPointPatch } from '@/model/group/GroupData';
import { GROUP_MAX_POINT_COUNT } from '@/model/group/GroupLimits';
import { getGroupErrorMessage } from '@/model/group-error/GroupErrorMessage';
import GroupPointDispatcher from './GroupPointDispatcher';

/**
 * 지도 포인트 목록 모델 (GRP-9).
 *
 * 그룹 상세의 포인트 섹션과 그룹 지도가 **같은 모델**을 쓴다 — 두 화면이 각자 조회·상한
 * 판정을 두면 같은 데이터에 다른 규칙이 붙는다. 유형 필터도 여기 싣는다(GRP-10).
 */
class GroupPointList {
  private points: GroupPoint[] = [];
  private selectedType: GroupPointType | null = null;
  private loading = false;
  private initialized = false;
  private submitting = false;
  private error: Error | null = null;

  public static from(dispatcher: GroupPointDispatcher, groupId: string) {
    return new GroupPointList(dispatcher, groupId);
  }

  private constructor(
    private readonly dispatcher: GroupPointDispatcher,
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

  public getPoints(): GroupPoint[] {
    return this.points;
  }

  // 유형 칩이 걸린 목록(GRP-10). 필터가 없으면 전체를 그대로 돌려준다.
  public getVisiblePoints(): GroupPoint[] {
    if (!this.selectedType) {
      return this.points;
    }

    return this.points.filter(point => point.getType() === this.selectedType);
  }

  public getPointById(pointId: string): GroupPoint | null {
    return this.points.find(point => point.getId() === pointId) ?? null;
  }

  public getSelectedType(): GroupPointType | null {
    return this.selectedType;
  }

  public selectType(type: GroupPointType | null): void {
    this.selectedType = type;
  }

  public getCount(): number {
    return this.points.length;
  }

  // 상한 50 (GRP-9). 화면은 이 값으로 등록 액션을 막고 안내를 띄운다.
  public isFull(): boolean {
    return this.points.length >= GROUP_MAX_POINT_COUNT;
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

  /**
   * 포인트 등록 (GRP-9). 상한은 서버 트랜잭션도 보지만 화면에서 먼저 막아
   * 사용자가 입력을 마친 뒤에 거절당하지 않게 한다.
   */
  public async createPoint(input: GroupPointInput): Promise<boolean> {
    if (this.submitting) {
      return false;
    }

    if (this.isFull()) {
      this.showMessage(
        getGroupErrorMessage(
          new GroupError(GroupValidationError.PointLimitExceeded)
        )
      );

      return false;
    }

    this.setSubmitting(true);

    try {
      await this.dispatcher.createPoint(this.groupId, input);
      app
        .getAnalyticsManager()
        ?.logClick('group_point_create', { type: input.type });
      await this.load(true);

      return true;
    } catch (error) {
      this.showMessage(getGroupErrorMessage(error));

      return false;
    } finally {
      this.setSubmitting(false);
    }
  }

  public async updatePoint(
    pointId: string,
    patch: GroupPointPatch
  ): Promise<boolean> {
    return this.runWrite(() =>
      this.dispatcher.updatePoint(this.groupId, pointId, patch)
    );
  }

  public async deletePoint(pointId: string): Promise<boolean> {
    return this.runWrite(() =>
      this.dispatcher.deletePoint(this.groupId, pointId)
    );
  }

  private async runWrite(action: () => Promise<void>): Promise<boolean> {
    if (this.submitting) {
      return false;
    }

    this.setSubmitting(true);

    try {
      await action();
      await this.load(true);

      return true;
    } catch (error) {
      this.showMessage(getGroupErrorMessage(error));

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
      const points = await this.dispatcher.getPoints(this.groupId);

      runInAction(() => {
        this.points = points;
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

export default GroupPointList;
