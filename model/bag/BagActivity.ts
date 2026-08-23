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
import { derivePaceSeries } from '../health/HealthPace';
import BagActivityDetailStatus from './BagActivityDetailStatus';
import BagActivityPhase from './BagActivityPhase';
import BagActivityPlatform from './BagActivityPlatform';
import { BagActivitySummary } from './BagActivitySummary';
import { BagActivityWorkoutDetail } from './BagActivityWorkoutDetail';

// UUID가 바뀐 운동을 요약값으로 다시 찾을 때의 허용 오차. 같은 기록이 재동기화되면
// 값이 미세하게 달라질 수 있어 약간의 여유를 준다.
const REMATCH_DISTANCE_TOLERANCE_METERS = 50;
const REMATCH_DURATION_TOLERANCE_SECONDS = 60;

/**
 * 배낭 여행에 운동 기록을 연결하는 화면의 도메인 모델(HA-2/HA-3).
 *
 * 건강 허브 접근은 `HealthService` 인터페이스로만 하고, Firestore에는
 * 참조와 요약 스냅샷만 저장한다(HA-5, DM-22).
 */
// 후보로 훑는 최근 기간(개월). 여행 기간으로 거르지 않는 대신 이 창으로 양을 제한한다.
const WORKOUT_WINDOW_MONTHS = 12;

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
  private weightGrams = 0;
  private details: BagActivityWorkoutDetail[] = [];
  private detailStatus: BagActivityDetailStatus =
    BagActivityDetailStatus.Loading;
  private workoutReadConfirmed = false;

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

  /** 저장된 요약 스냅샷(DM-22). 기기 조회가 실패해도 이 값은 항상 있다(HA-5). */
  public getLinkedSummary() {
    return this.linked;
  }

  /** 배낭 총 무게(g). 상세에서 "무게 ↔ 이동"을 잇는 데 쓴다(HA-4). */
  public getWeightGrams() {
    return this.weightGrams;
  }

  public getDetailStatus() {
    return this.detailStatus;
  }

  public getDetails() {
    return this.details;
  }

  /**
   * **운동(워크아웃) 읽기** 접근이 확인됐는지(HA-2). 빈 상태 문구를 가르는 데만 쓴다 —
   * true면 권한 언급 없이 "이 기간에 기록이 없다"만 안내한다. false는 거부가 아니라
   * 판별 불가다.
   *
   * 확인 범위는 운동 읽기 하나뿐이라 경로·거리·에너지·심박은 true여도 판별 불가다.
   * **HA-4의 지표·경로 렌더링을 이 값으로 막지 마라.**
   */
  public isWorkoutReadConfirmed() {
    return this.workoutReadConfirmed;
  }

  /** 지도에 그릴 경로만 추린다. 하나도 없으면 지도 영역 자체를 렌더하지 않는다(HA-4). */
  public getRoutes() {
    return this.details
      .map(detail => detail.route)
      .filter(route => route !== null);
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

  private setWeightGrams(value: number) {
    this.weightGrams = value;
  }

  private setDetails(value: BagActivityWorkoutDetail[]) {
    this.details = value;
  }

  private setDetailStatus(value: BagActivityDetailStatus) {
    this.detailStatus = value;
  }

  private setWorkoutReadConfirmed(value: boolean) {
    this.workoutReadConfirmed = value;
  }

  /**
   * 화면 진입 시 1회. 기간·무게·연결 상태를 읽는다.
   *
   * 이미 연결된 기록이 있으면 후보 선택 대신 **상세로 연다**(HA-4) — 연결이 끝난
   * 사용자에게 매번 선택 목록을 다시 보여줄 이유가 없다. 재선택은 별도 액션이다.
   * 연결이 없으면 기존 흐름대로, 권한 요청을 마친 사용자는 곧바로 후보를 조회하고
   * 아직 요청 전이면 설명 화면(Intro)에서 멈춘다(HA-2).
   */
  public async load() {
    const { startDate, endDate, weight, activity } =
      await this.bagStore.getBagActivityData(this.bagId);

    if (startDate && endDate) {
      this.startDate = dayjs(startDate);
      this.endDate = dayjs(endDate);
    }

    this.setWeightGrams(weight ?? 0);
    this.setLinked(activity);
    // 이미 연결된 기록은 선택된 상태로 열어 해제·수정이 바로 가능하게 한다(HA-3).
    this.setSelectedIds(activity ? [...activity.workoutIds] : []);

    if (activity) {
      this.setPhase(BagActivityPhase.Detail);
      await this.loadDetail();

      return;
    }

    await this.enterPicker();
  }

  /** 후보 선택 단계 진입. 권한을 이미 받았으면 조회로, 아니면 설명 화면으로 간다(HA-2). */
  private async enterPicker() {
    this.setPhase(BagActivityPhase.Loading);

    const status = await this.healthService.getPermissionStatus();

    if (status === HealthPermissionStatus.Granted) {
      await this.queryCandidates();

      return;
    }

    this.setPhase(BagActivityPhase.Intro);
  }

  /** 상세에서 "다시 선택" — 후보 목록으로 돌아간다(HA-4). */
  public async reselect() {
    await this.enterPicker();
  }

  /**
   * 연결된 운동의 상세를 기기에서 읽는다(HA-4).
   *
   * 저장된 건 참조(`workoutIds`)뿐이라(HA-5) 기간으로 다시 조회해 id로 맞춘다.
   * 조회 창은 **여행 기간과 최근 창의 합집합**이다 — 후보를 여행 기간 밖까지 넓히면서
   * 여행 밖 운동도 연결될 수 있게 됐고, 반대로 오래된 여행의 연결도 깨지면 안 된다.
   * 경로는 운동과 **별개 권한**이라 운동은 읽히는데 경로만 실패할 수 있고, 그 경우
   * 조용히 지도만 생략한다 — 요약까지 막지 않는다.
   */
  private async loadDetail() {
    const linked = this.linked;

    if (!linked) {
      return;
    }

    this.setDetailStatus(BagActivityDetailStatus.Loading);

    try {
      const recentFrom = dayjs().subtract(WORKOUT_WINDOW_MONTHS, 'month');
      const from = this.startDate.isBefore(recentFrom)
        ? this.startDate
        : recentFrom;
      const now = dayjs();
      const to = this.endDate.isAfter(now) ? this.endDate : now;

      const workouts = await this.healthService.queryWorkouts({
        from: from.startOf('day').toDate(),
        to: to.endOf('day').toDate(),
      });
      let linkedWorkouts = linked.workoutIds
        .map(id => workouts.find(workout => workout.id === id))
        .filter(workout => workout !== undefined);

      // HealthKit 워크아웃 UUID는 영구적이지 않다 — 가민 등 서드파티 동기화가 기록을
      // 다시 쓰면 같은 운동이 새 UUID로 바뀐다. 그러면 저장해 둔 id가 아무것도 가리키지
      // 못해 연결이 저절로 끊긴 것처럼 보인다. 요약값으로 다시 찾아 자가 치유한다.
      if (linkedWorkouts.length === 0 && workouts.length > 0) {
        const rematched = this.rematchBySummary(workouts, linked);

        if (rematched.length > 0) {
          linkedWorkouts = rematched;
          // 다음 진입부터는 정상 경로를 타도록 새 id를 저장한다.
          await this.persistRematchedIds(rematched);
        }
      }

      if (linkedWorkouts.length === 0) {
        // 권한 회수·기기 변경·허브에서 삭제 — 어느 쪽인지 알 수 없다. 요약만 남긴다(HA-5).
        this.setDetails([]);
        this.setDetailStatus(BagActivityDetailStatus.Unavailable);

        return;
      }

      const details = await Promise.all(
        linkedWorkouts.map(workout => this.loadWorkoutDetail(workout))
      );

      this.setDetails(details);
      this.setDetailStatus(BagActivityDetailStatus.Ready);
    } catch (error) {
      console.error('운동 기록 상세 조회 실패:', error); // l10n-ignore
      this.setDetails([]);
      this.setDetailStatus(BagActivityDetailStatus.Unavailable);
    }
  }

  // 저장된 요약값으로 같은 운동을 다시 찾는다(UUID 변동 대응).
  // 거리·소요시간이 둘 다 허용 오차 안이어야 같은 운동으로 본다 — 같은 여행 기간에
  // 두 값이 동시에 근접한 다른 운동이 있을 확률은 낮다.
  private rematchBySummary(
    workouts: HealthWorkout[],
    linked: BagActivitySummary
  ): HealthWorkout[] {
    // 복수 연결이었다면 개별 값을 알 수 없다(합산만 저장한다). 합이 맞는 조합을 찾는
    // 것은 과하고 오매칭 위험도 커서, 단건 연결일 때만 재매칭한다.
    if (linked.workoutIds.length !== 1) {
      return [];
    }

    const matched = workouts.filter(workout => {
      const distanceGap = Math.abs(
        (workout.distanceMeters ?? 0) - linked.distance
      );
      const durationGap = Math.abs(workout.durationSeconds - linked.duration);

      return (
        distanceGap <= REMATCH_DISTANCE_TOLERANCE_METERS &&
        durationGap <= REMATCH_DURATION_TOLERANCE_SECONDS
      );
    });

    // 후보가 여럿이면 어느 쪽인지 확신할 수 없어 재매칭하지 않는다(오매칭 방지).
    if (matched.length !== 1) {
      return [];
    }

    return matched;
  }

  private async persistRematchedIds(workouts: HealthWorkout[]) {
    const linked = this.linked;

    if (!linked) {
      return;
    }

    const next: BagActivitySummary = {
      ...linked,
      workoutIds: workouts.map(workout => workout.id),
    };

    try {
      await this.bagStore.updateActivity(this.bagId, next);
      this.setLinked(next);
    } catch (error) {
      // 저장에 실패해도 이번 화면은 재매칭 결과로 보여준다 — 다음 진입에서 다시 시도한다.
      console.error('운동 기록 재매칭 저장 실패:', error); // l10n-ignore
    }
  }

  private async loadWorkoutDetail(
    workout: HealthWorkout
  ): Promise<BagActivityWorkoutDetail> {
    const [route, heartRateSeries] = await Promise.all([
      this.healthService.getRoute(workout.id),
      this.healthService.getHeartRateSeries(workout.id),
    ]);

    return {
      workout,
      route,
      heartRateSeries,
      // 페이스는 허브가 주지 않아 경로에서 파생한다 — 경로가 없으면 그래프도 없다.
      paceSeries: route ? derivePaceSeries(route.points) : [],
    };
  }

  /** 상세 조회 실패 후 재시도. */
  public async retryDetail() {
    await this.loadDetail();
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
        from: dayjs()
          .subtract(WORKOUT_WINDOW_MONTHS, 'month')
          .startOf('day')
          .toDate(),
        to: dayjs().endOf('day').toDate(),
      });

      this.setCandidates(workouts);

      if (workouts.length === 0) {
        // 빈 상태 문구는 운동 읽기 확인 여부로 갈린다(HA-2/HA-3). 프로브는 **후보가
        // 0건일 때만** 태워 평상시 비용을 0으로 둔다.
        //
        // Empty로 넘기기 전에 await한다 — 순서를 뒤집으면 프로브가 끝나기 전 한 프레임
        // 동안 "접근이 허용되지 않았어요"가 떴다가 뒤바뀐다. 프로브 동안 화면은 Loading이다.
        const confirmed = await this.healthService.isWorkoutReadConfirmed();

        this.setWorkoutReadConfirmed(confirmed);
        this.setPhase(BagActivityPhase.Empty);

        return;
      }

      this.setPhase(BagActivityPhase.Ready);
    } catch (error) {
      console.error('운동 기록 조회 실패:', error); // l10n-ignore
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
      this.toastManager.show({ message: app.getL10n().t('health.linked') });

      // 화면을 닫지 않고 그 자리에서 상세로 넘어간다 — 방금 연결한 기록을 바로 보는
      // 것이 자연스럽고, 배낭 상세로 돌아갔다가 다시 들어오게 만들 이유가 없다.
      this.setPhase(BagActivityPhase.Detail);
      await this.loadDetail();
    } catch (error) {
      console.error('운동 기록 연결 실패:', error); // l10n-ignore
      this.toastManager.show({ message: app.getL10n().t('health.linkFailed') });
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
      this.toastManager.show({ message: app.getL10n().t('health.unlinked') });
    } catch (error) {
      console.error('운동 기록 연결 해제 실패:', error); // l10n-ignore
      this.toastManager.show({ message: app.getL10n().t('health.unlinkFailed') });
    } finally {
      this.setSaving(false);
    }
  }

  public back() {
    router.back();
  }
}

export default BagActivity;
