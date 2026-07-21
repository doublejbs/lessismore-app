import {
  AuthorizationRequestStatus,
  getRequestStatusForAuthorization,
  isHealthDataAvailable,
  queryQuantitySamples,
  queryWorkoutSamples,
  requestAuthorization,
  WorkoutActivityType,
  WorkoutRouteTypeIdentifier,
  WorkoutTypeIdentifier,
} from '@kingstinct/react-native-healthkit';
import type {
  ObjectTypeIdentifier,
  Quantity,
  QuantityTypeIdentifier,
  WorkoutProxyTyped,
} from '@kingstinct/react-native-healthkit';
import HealthPermissionStatus from './HealthPermissionStatus';
import {
  HealthRoutePoint,
  HealthSeriesPoint,
  HealthWorkout,
  HealthWorkoutQuery,
  HealthWorkoutRoute,
} from './HealthTypes';
import HealthWorkoutType from './HealthWorkoutType';

// iOS HealthKit 구현(HA-2/HA-3/HA-5). **읽기 전용** — 건강 허브에 쓰는 함수를 두지 않는다.
// 앱 코드는 이 클래스를 직접 참조하지 않고 `HealthService` 인터페이스만 본다.

const DISTANCE_WALKING_RUNNING_TYPE =
  'HKQuantityTypeIdentifierDistanceWalkingRunning';
const DISTANCE_CYCLING_TYPE = 'HKQuantityTypeIdentifierDistanceCycling';
const ACTIVE_ENERGY_TYPE = 'HKQuantityTypeIdentifierActiveEnergyBurned';
const HEART_RATE_TYPE = 'HKQuantityTypeIdentifierHeartRate';

const METERS_UNIT = 'm';
const KILOCALORIES_UNIT = 'kcal';
const BEATS_PER_MINUTE_UNIT = 'count/min';

/**
 * 요청하는 읽기 타입(HA-2). 화면(HA-4)이 표시하는 항목만 담는다 —
 * 기능이 정당화하지 못하는 범위를 요청하면 App Store 심사 2.5.1에 걸린다.
 *
 * - 운동 경로는 운동 읽기와 **별개 권한**이라 따로 넣어야 한다.
 * - 거리는 워크아웃 종류에 따라 걷기/달리기용과 자전거용 타입이 갈려 둘 다 필요하다.
 *   화면에 노출되는 개념은 "이동 거리" 하나다.
 * - 상승고도에 해당하는 quantity 타입은 HealthKit에 **없다.** 워크아웃 메타데이터
 *   `HKElevationAscended`로 오며, 운동 읽기 권한에 딸려오므로 별도 요청 대상이 아니다.
 */
const READ_TYPES: readonly ObjectTypeIdentifier[] = [
  WorkoutTypeIdentifier,
  WorkoutRouteTypeIdentifier,
  DISTANCE_WALKING_RUNNING_TYPE,
  DISTANCE_CYCLING_TYPE,
  ACTIVE_ENERGY_TYPE,
  HEART_RATE_TYPE,
];

// HealthKit의 80여 개 운동 종류 중 백패킹 맥락에서 의미 있는 것만 도메인 타입으로 접는다.
const WORKOUT_TYPE_BY_ACTIVITY: Partial<
  Record<WorkoutActivityType, HealthWorkoutType>
> = {
  [WorkoutActivityType.hiking]: HealthWorkoutType.Hiking,
  [WorkoutActivityType.walking]: HealthWorkoutType.Walking,
  [WorkoutActivityType.running]: HealthWorkoutType.Running,
  [WorkoutActivityType.cycling]: HealthWorkoutType.Cycling,
};

// HealthKit이 돌려주는 단위는 기기 지역 설정을 따라 mi/ft일 수 있어 SI로 정규화한다.
const LENGTH_TO_METERS: Record<string, number> = {
  m: 1,
  km: 1000,
  cm: 0.01,
  mm: 0.001,
  mi: 1609.344,
  ft: 0.3048,
  yd: 0.9144,
  in: 0.0254,
};

// HealthKit의 'Cal'(대문자)은 큰 칼로리 = kcal, 'cal'(소문자)은 작은 칼로리다.
const ENERGY_TO_KILOCALORIES: Record<string, number> = {
  kcal: 1,
  Cal: 1,
  cal: 0.001,
  kJ: 0.239006,
  J: 0.000239006,
};

const DURATION_TO_SECONDS: Record<string, number> = {
  s: 1,
  min: 60,
  hr: 3600,
  ms: 0.001,
};

const convertQuantity = (
  quantity: Quantity | undefined,
  table: Record<string, number>
): number | undefined => {
  if (!quantity) {
    return undefined;
  }

  const factor = table[quantity.unit];

  // 모르는 단위를 그대로 쓰면 조용히 틀린 숫자가 화면에 뜬다. 차라리 값을 비운다.
  if (factor === undefined) {
    return undefined;
  }

  return quantity.quantity * factor;
};

class HealthKitService {
  public static new = (): HealthKitService => {
    return new HealthKitService();
  };

  public isAvailable = (): boolean => {
    return isHealthDataAvailable();
  };

  public getPermissionStatus = async (): Promise<HealthPermissionStatus> => {
    if (!this.isAvailable()) {
      return HealthPermissionStatus.Unsupported;
    }

    try {
      const status = await getRequestStatusForAuthorization({
        toRead: READ_TYPES,
      });

      // HealthKit은 읽기 권한의 거부 여부를 알려주지 않는다(사용자 프라이버시 보호).
      // 알 수 있는 건 "물어봐야 하는가"뿐이라 unnecessary는 허용으로 간주한다.
      if (status === AuthorizationRequestStatus.unnecessary) {
        return HealthPermissionStatus.Granted;
      }

      return HealthPermissionStatus.NotDetermined;
    } catch {
      return HealthPermissionStatus.NotDetermined;
    }
  };

  public requestPermission = async (): Promise<HealthPermissionStatus> => {
    if (!this.isAvailable()) {
      return HealthPermissionStatus.Unsupported;
    }

    try {
      // toShare는 넘기지 않는다 — 읽기 전용이며 쓰기 권한을 요청하면 심사에서 문제가 된다(HA-2).
      const requested = await requestAuthorization({ toRead: READ_TYPES });

      if (!requested) {
        return HealthPermissionStatus.Denied;
      }

      return await this.getPermissionStatus();
    } catch {
      return HealthPermissionStatus.Denied;
    }
  };

  public queryWorkouts = async ({
    from,
    to,
  }: HealthWorkoutQuery): Promise<HealthWorkout[]> => {
    if (!this.isAvailable()) {
      return [];
    }

    // 권한이 없으면 HealthKit은 에러 대신 빈 결과를 주지만, 타입 자체가 막히면
    // 예외가 날 수도 있다. 어느 쪽이든 화면은 "기록 없음"으로 떨어져야 한다(HA-2).
    try {
      const proxies = await queryWorkoutSamples({
        filter: { date: { startDate: from, endDate: to } },
        limit: -1,
        ascending: false,
      });

      const workouts = await Promise.all(
        proxies.map(proxy => this.mapWorkout(proxy))
      );

      // ascending:false로도 최신순이 오지만, 소스가 섞이면 순서가 흔들려 한 번 더 고정한다.
      return workouts.sort(
        (left, right) => right.startDate.getTime() - left.startDate.getTime()
      );
    } catch {
      return [];
    }
  };

  public getRoute = async (
    workoutId: string
  ): Promise<HealthWorkoutRoute | null> => {
    const proxy = await this.findWorkout(workoutId);

    if (!proxy) {
      return null;
    }

    try {
      // 경로는 운동과 별개 권한이라, 운동은 읽히는데 여기서만 실패할 수 있다.
      const routes = await proxy.getWorkoutRoutes();
      const points: HealthRoutePoint[] = [];

      routes.forEach(route => {
        route.locations.forEach(location => {
          const point: HealthRoutePoint = {
            latitude: location.latitude,
            longitude: location.longitude,
            timestamp: location.date,
          };

          // 고도계 없는 기기는 altitude를 0으로 채워 보낸다. 0은 유효값이라 거르지 않고
          // 그대로 넘기되, 표시 쪽에서 상승고도(메타데이터)와 혼동하지 않게 별도 필드로 둔다.
          point.altitudeMeters = location.altitude;
          points.push(point);
        });
      });

      if (points.length === 0) {
        return null;
      }

      // 한 운동이 여러 route 샘플로 쪼개져 오는 경우가 있어 합친 뒤 시간순으로 정렬한다.
      points.sort(
        (left, right) => left.timestamp.getTime() - right.timestamp.getTime()
      );

      return { workoutId, points };
    } catch {
      return null;
    }
  };

  public getHeartRateSeries = async (
    workoutId: string
  ): Promise<HealthSeriesPoint[]> => {
    const proxy = await this.findWorkout(workoutId);

    if (!proxy) {
      return [];
    }

    try {
      const samples = await queryQuantitySamples(HEART_RATE_TYPE, {
        // 기간이 아니라 워크아웃으로 거른다 — 같은 시간대의 다른 기록이 섞이지 않는다.
        filter: { workout: proxy },
        limit: -1,
        ascending: true,
        unit: BEATS_PER_MINUTE_UNIT,
      });

      return samples.map(sample => ({
        timestamp: sample.startDate,
        value: sample.quantity,
      }));
    } catch {
      return [];
    }
  };

  private findWorkout = async (
    workoutId: string
  ): Promise<WorkoutProxyTyped | undefined> => {
    if (!this.isAvailable()) {
      return undefined;
    }

    try {
      // 라이브러리 루트가 uuid 단건 조회를 노출하지 않아 uuid 필터로 1건만 뽑는다.
      const proxies = await queryWorkoutSamples({
        filter: { uuid: workoutId },
        limit: 1,
      });

      return proxies[0];
    } catch {
      return undefined;
    }
  };

  private mapWorkout = async (
    proxy: WorkoutProxyTyped
  ): Promise<HealthWorkout> => {
    // toJSON()으로 기본 필드를 한 번에 가져온다. 프록시 프로퍼티를 하나씩 읽으면
    // 매번 네이티브 호출이 나가 후보 목록처럼 건수가 많을 때 비싸다.
    const sample = proxy.toJSON();
    const workout: HealthWorkout = {
      id: sample.uuid,
      type:
        WORKOUT_TYPE_BY_ACTIVITY[sample.workoutActivityType] ??
        HealthWorkoutType.Other,
      startDate: sample.startDate,
      endDate: sample.endDate,
      durationSeconds:
        convertQuantity(sample.duration, DURATION_TO_SECONDS) ??
        (sample.endDate.getTime() - sample.startDate.getTime()) / 1000,
    };

    const distanceType =
      sample.workoutActivityType === WorkoutActivityType.cycling
        ? DISTANCE_CYCLING_TYPE
        : DISTANCE_WALKING_RUNNING_TYPE;
    // 합계가 워크아웃에 붙어 있으면 그걸 쓰고, 없으면 하위 샘플 통계로 채운다.
    // 둘 다 없는 워크아웃(실내 운동 등)이 정상이라 예외로 다루지 않는다.
    const distanceMeters =
      convertQuantity(sample.totalDistance, LENGTH_TO_METERS) ??
      (await this.readSumStatistic(proxy, distanceType, METERS_UNIT));

    if (distanceMeters !== undefined) {
      workout.distanceMeters = distanceMeters;
    }

    // 상승고도는 quantity 타입이 없어 워크아웃 메타데이터로만 온다.
    // 고도계 없는 기기로 기록했으면 아예 키가 없다.
    const elevationAscendedMeters = convertQuantity(
      sample.metadata?.HKElevationAscended,
      LENGTH_TO_METERS
    );

    if (elevationAscendedMeters !== undefined) {
      workout.elevationAscendedMeters = elevationAscendedMeters;
    }

    const activeEnergyKilocalories =
      convertQuantity(sample.totalEnergyBurned, ENERGY_TO_KILOCALORIES) ??
      (await this.readSumStatistic(
        proxy,
        ACTIVE_ENERGY_TYPE,
        KILOCALORIES_UNIT
      ));

    if (activeEnergyKilocalories !== undefined) {
      workout.activeEnergyKilocalories = activeEnergyKilocalories;
    }

    return workout;
  };

  private readSumStatistic = async (
    proxy: WorkoutProxyTyped,
    quantityType: QuantityTypeIdentifier,
    unit: string
  ): Promise<number | undefined> => {
    try {
      // 모든 워크아웃이 모든 통계를 갖지는 않는다. 없으면 undefined가 정상 결과다.
      const statistic = await proxy.getStatistic(quantityType, unit);

      return statistic?.sumQuantity?.quantity;
    } catch {
      return undefined;
    }
  };
}

export default HealthKitService;
