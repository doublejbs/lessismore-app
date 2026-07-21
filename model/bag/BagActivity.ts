import dayjs from 'dayjs';
import { makeAutoObservable } from 'mobx';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import app from '../app/App';
import BagStore from '../store/BagStore';
import ToastManager from '../toast/ToastManager';
import HealthPermissionStatus from '../health/HealthPermissionStatus';
import { HealthService } from '../health/HealthService';
import { HealthWorkout } from '../health/HealthTypes';
import BagActivityPhase from './BagActivityPhase';
import BagActivityPlatform from './BagActivityPlatform';
import { BagActivitySummary } from './BagActivitySummary';

/**
 * 배낭 여행에 운동 기록을 연결하는 화면의 도메인 모델(HA-2/HA-3).
 *
 * 건강 허브 접근은 `HealthService` 인터페이스로만 하고, Firestore에는
 * 참조와 요약 스냅샷만 저장한다(HA-5, DM-22).
 */
class BagActivity {
  public static of(
    bagId: string,
    bagStore: BagStore,
    healthService: HealthService,
    toastManager: ToastManager
  ) {
    return new BagActivity(bagId, bagStore, healthService, toastManager);
  }

  private phase: BagActivityPhase = BagActivityPhase.Preparing;
  private candidates: HealthWorkout[] = [];
  private selectedIds: string[] = [];
  private linked: BagActivitySummary | null = null;
  private startDate = dayjs();
  private endDate = dayjs();
  private saving = false;

  private constructor(
    private readonly bagId: string,
    private readonly bagStore: BagStore,
    private readonly healthService: HealthService,
    private readonly toastManager: ToastManager
  ) {
    makeAutoObservable(this);
  }

  public getPhase() {
    return this.phase;
  }

  public getCandidates() {
    return this.candidates;
  }

  public isSaving() {
    return this.saving;
  }

  public isSelected(workoutId: string) {
    return this.selectedIds.includes(workoutId);
  }

  public getSelectedCount() {
    return this.selectedIds.length;
  }

  public hasLinked() {
    return this.linked !== null;
  }

  private setPhase(value: BagActivityPhase) {
    this.phase = value;
  }

  private setCandidates(value: HealthWorkout[]) {
    this.candidates = value;
  }

  private setSelectedIds(value: string[]) {
    this.selectedIds = value;
  }

  private setLinked(value: BagActivitySummary | null) {
    this.linked = value;
  }

  private setSaving(value: boolean) {
    this.saving = value;
  }

  /**
   * 화면 진입 시 1회. 기간·연결 상태를 읽고, 이미 권한 요청을 마친 사용자는
   * 곧바로 후보를 조회한다. 아직 요청 전이면 설명 화면(Intro)에서 멈춘다(HA-2).
   */
  public async load() {
    const { startDate, endDate, activity } =
      await this.bagStore.getBagActivityData(this.bagId);

    if (startDate && endDate) {
      this.startDate = dayjs(startDate);
      this.endDate = dayjs(endDate);
    }

    this.setLinked(activity);
    // 이미 연결된 기록은 선택된 상태로 열어 해제·수정이 바로 가능하게 한다(HA-3).
    this.setSelectedIds(activity ? [...activity.workoutIds] : []);

    const status = await this.healthService.getPermissionStatus();

    if (status === HealthPermissionStatus.Granted) {
      await this.queryCandidates();

      return;
    }

    this.setPhase(BagActivityPhase.Intro);
  }

  /** 설명 화면의 주 액션. 타일 탭 이후 이 시점에만 권한 시트를 띄운다(HA-2). */
  public async requestPermission() {
    this.setPhase(BagActivityPhase.Loading);

    const status = await this.healthService.requestPermission();

    app.getAnalyticsManager()?.logClick('activity_permission', {
      granted: status === HealthPermissionStatus.Granted,
    });

    // iOS는 사용자가 거부해도 Granted로 보인다(HealthKit이 거부를 숨긴다).
    // 따라서 거부를 분기하지 않고, 조회 결과가 비면 "기록 없음 또는 미허용"으로 안내한다.
    await this.queryCandidates();
  }

  /**
   * 후보 조회(HA-3). 기간은 시작일 00:00 ~ 종료일 23:59.
   *
   * **위치 필터(반경 30km)는 적용하지 못한다.** `HealthWorkout`에 운동 시작 좌표가
   * 없고(경로는 별도 권한의 `getRoute`로만 얻는다), 후보 목록을 만들자고 전 후보의
   * 경로를 내려받는 건 비용·권한 범위 모두 과하다. 기간 조건만 적용하고 최종 선택은
   * 사용자가 한다. 시작 좌표가 도메인 타입에 생기면 `GeoDistance.getDistanceInMeters`로
   * 걸러 넣으면 된다.
   */
  private async queryCandidates() {
    this.setPhase(BagActivityPhase.Loading);

    try {
      const workouts = await this.healthService.queryWorkouts({
        from: this.startDate.startOf('day').toDate(),
        to: this.endDate.endOf('day').toDate(),
      });

      this.setCandidates(workouts);
      this.setPhase(
        workouts.length > 0 ? BagActivityPhase.Ready : BagActivityPhase.Empty
      );
    } catch (error) {
      console.error('운동 기록 조회 실패:', error);
      this.setPhase(BagActivityPhase.Error);
    }
  }

  /** 조회 실패 후 재시도. */
  public async retry() {
    await this.queryCandidates();
  }

  public toggle(workoutId: string) {
    if (this.selectedIds.includes(workoutId)) {
      this.setSelectedIds(this.selectedIds.filter(id => id !== workoutId));

      return;
    }

    this.setSelectedIds([...this.selectedIds, workoutId]);
  }

  /** 선택한 운동들. 연결 당시 후보에 없던(허브에서 사라진) ID는 자연히 빠진다. */
  private getSelectedWorkouts() {
    return this.candidates.filter(workout =>
      this.selectedIds.includes(workout.id)
    );
  }

  /** 하단에 보여줄 합산 요약. 선택이 없으면 null. */
  public getSelectedSummary() {
    const workouts = this.getSelectedWorkouts();

    if (workouts.length === 0) {
      return null;
    }

    return {
      count: workouts.length,
      distance: this.sum(workouts, workout => workout.distanceMeters),
      duration: this.sum(workouts, workout => workout.durationSeconds),
      elevationGain: this.sumOptional(
        workouts,
        workout => workout.elevationAscendedMeters
      ),
      activeEnergy: this.sumOptional(
        workouts,
        workout => workout.activeEnergyKilocalories
      ),
    };
  }

  private sum(
    workouts: HealthWorkout[],
    pick: (workout: HealthWorkout) => number | undefined
  ) {
    return workouts.reduce((total, workout) => total + (pick(workout) ?? 0), 0);
  }

  // 아무 운동도 값을 갖지 않으면 0이 아니라 "없음"이다 — DM-22에서 해당 필드를 생략한다.
  private sumOptional(
    workouts: HealthWorkout[],
    pick: (workout: HealthWorkout) => number | undefined
  ) {
    const values = workouts
      .map(pick)
      .filter((value): value is number => value !== undefined);

    if (values.length === 0) {
      return undefined;
    }

    return values.reduce((total, value) => total + value, 0);
  }

  private getPlatform(): BagActivityPlatform {
    if (Platform.OS === 'android') {
      return BagActivityPlatform.HealthConnect;
    }

    return BagActivityPlatform.HealthKit;
  }

  /** 선택 확정 → DM-22 저장 → 배낭 상세로 복귀. */
  public async link() {
    const workouts = this.getSelectedWorkouts();

    if (workouts.length === 0 || this.saving) {
      return;
    }

    const summary = this.getSelectedSummary();

    if (!summary) {
      return;
    }

    // exactOptionalPropertyTypes라 undefined를 그대로 넣을 수 없다.
    // Firestore도 undefined 필드를 거부하므로 값이 있을 때만 붙인다.
    const activity: BagActivitySummary = {
      workoutIds: workouts.map(workout => workout.id),
      platform: this.getPlatform(),
      distance: summary.distance,
      duration: summary.duration,
      linkedAt: new Date().toISOString(),
    };

    if (summary.elevationGain !== undefined) {
      activity.elevationGain = summary.elevationGain;
    }

    if (summary.activeEnergy !== undefined) {
      activity.activeEnergy = summary.activeEnergy;
    }

    this.setSaving(true);

    try {
      await this.bagStore.updateActivity(this.bagId, activity);

      app.getAnalyticsManager()?.logClick('activity_link', {
        count: activity.workoutIds.length,
        source: 'suggested',
      });

      this.setLinked(activity);
      router.back();
      this.toastManager.show({ message: '운동 기록을 연결했습니다.' });
    } catch (error) {
      console.error('운동 기록 연결 실패:', error);
      this.toastManager.show({ message: '연결에 실패했습니다.' });
    } finally {
      this.setSaving(false);
    }
  }

  /** 연결 해제(HA-3). */
  public async unlink() {
    if (!this.linked || this.saving) {
      return;
    }

    this.setSaving(true);

    try {
      await this.bagStore.removeActivity(this.bagId);

      app.getAnalyticsManager()?.logClick('activity_unlink');

      this.setLinked(null);
      this.setSelectedIds([]);
      router.back();
      this.toastManager.show({ message: '운동 기록 연결을 해제했습니다.' });
    } catch (error) {
      console.error('운동 기록 연결 해제 실패:', error);
      this.toastManager.show({ message: '연결 해제에 실패했습니다.' });
    } finally {
      this.setSaving(false);
    }
  }

  public back() {
    router.back();
  }
}

export default BagActivity;
