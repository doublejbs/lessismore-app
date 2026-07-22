import { Platform } from 'react-native';
import {
  aggregateRecord,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  readRecord,
  readRecords,
  requestPermission,
  ExerciseType,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';
import type {
  AggregateRequest,
  AggregateResult,
  AggregateResultRecordType,
  Permission,
  ReadRecordsOptions,
  RecordResult,
  RecordType,
} from 'react-native-health-connect';
import HealthPermissionStatus from './HealthPermissionStatus';
import type { HealthService } from './HealthService';
import {
  HealthRoutePoint,
  HealthSeriesPoint,
  HealthWorkout,
  HealthWorkoutQuery,
  HealthWorkoutRoute,
} from './HealthTypes';
import HealthWorkoutType from './HealthWorkoutType';

// Android Health Connect 구현(HA-2/HA-3/HA-4). **읽기 전용** — 건강 허브에 쓰는 함수를 두지 않는다.
// 앱 코드는 이 클래스를 직접 참조하지 않고 `HealthService` 인터페이스만 본다.
//
// HealthKit과의 근본적인 차이: 거리·상승고도·칼로리가 워크아웃 객체에 붙어 오지 않고
// **독립된 레코드 타입**이라, 세션 하나를 채우려면 시간 구간으로 aggregate를 따로 걸어야 한다.

// Health Connect는 Android 14(API 34)부터 OS에 내장된다. 그 미만은 별도 앱 설치가
// 전제라 지원 범위에서 제외한다(스펙 5. 플랫폼 분기).
const MIN_ANDROID_API_LEVEL = 34;

// readRecords는 한도에 걸리면 에러 없이 앞부분만 돌려주므로 pageToken을 따라가야 한다.
// 허브가 토큰을 계속 돌려주는 이상 동작에 대비해 상한을 둔다 — 장시간 산행의 심박이
// 수만 건인 것을 감안한 값이다.
const MAX_RECORD_PAGES = 50;

// 이 클래스의 public 메서드는 던지지 않는 계약이라(호출부가 화면을 막지 않는다)
// 실패가 전부 빈 값으로 떨어진다. 흔적까지 지우면 필드에서 원인을 좁힐 수 없어
// 삼키되 로그는 남긴다.
const logHealthError = (scope: string, error: unknown): void => {
  console.error(`[HealthConnect] ${scope} 실패:`, error);
};

/**
 * 요청하는 읽기 권한(HA-2). 화면(HA-4)이 표시하는 항목만 담는다.
 *
 * **경로(ExerciseRoute)가 여기 없는 것은 누락이 아니다.** Health Connect의 경로 읽기는
 * 두 갈래인데, 라이브러리의 `Permission` 타입이 받는 `recordType`은 레코드 타입 유니언이라
 * `'ExerciseRoute'`를 표현할 수 없다(쓰기용 `WriteExerciseRoutePermission`만 별도로 있다).
 * - `READ_EXERCISE_ROUTES`(복수, 전체 경로 일괄): Google Play에 별도 선언·심사가 필요하다.
 * - `READ_EXERCISE_ROUTE`(단수, 레코드 단위): `requestExerciseRoute()`가 띄우는
 *   사용자 동의 다이얼로그로 건건이 얻는다.
 *
 * **현재는 둘 다 쓰지 않는다.** 후자는 다이얼로그를 띄우는데 `getRoute()`가 상세 진입마다
 * 자동 호출돼 사용자가 요청하지 않은 다이얼로그가 뜬다 — 자세한 트레이드오프는
 * `readRoute()` 주석 참고.
 */
const READ_PERMISSIONS: readonly Permission[] = [
  { accessType: 'read', recordType: 'ExerciseSession' },
  { accessType: 'read', recordType: 'Distance' },
  { accessType: 'read', recordType: 'ElevationGained' },
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
  { accessType: 'read', recordType: 'HeartRate' },
];

// 운동 목록 자체를 못 읽으면 화면이 성립하지 않는다. 나머지 지표는 없으면 필드만 비면 되므로
// 권한 상태 판정은 이 하나를 기준으로 한다.
const ESSENTIAL_RECORD_TYPE = 'ExerciseSession';

// Health Connect의 운동 종류(수십 가지) 중 백패킹 맥락에서 의미 있는 것만 도메인 타입으로 접는다.
// 숫자 리터럴 대신 라이브러리 상수를 참조해 라이브러리가 값을 바꿔도 따라가게 한다.
const WORKOUT_TYPE_BY_EXERCISE_TYPE: Record<number, HealthWorkoutType> = {
  [ExerciseType.HIKING]: HealthWorkoutType.Hiking,
  [ExerciseType.WALKING]: HealthWorkoutType.Walking,
  [ExerciseType.RUNNING]: HealthWorkoutType.Running,
  [ExerciseType.BIKING]: HealthWorkoutType.Cycling,
};

// 경로 좌표의 고도는 `Length`(값 + 단위)로 오므로 SI로 정규화한다. 도메인 타입은 전 구간 m다.
const LENGTH_TO_METERS: Record<string, number> = {
  meters: 1,
  kilometers: 1000,
  miles: 1609.344,
  feet: 0.3048,
  inches: 0.0254,
};

type TimeRange = AggregateRequest<'Distance'>['timeRangeFilter'];
type ExerciseSessionResult = RecordResult<'ExerciseSession'>;
// 경로 관련 타입은 패키지 루트로 re-export되지 않아(`types/index.d.ts`가 base.types를
// 내보내지 않는다) 딥 임포트 대신 레코드 결과 타입에서 파생시킨다.
type ExerciseRouteResult = NonNullable<ExerciseSessionResult['exerciseRoute']>;
type RouteLocation = ExerciseRouteResult['route'][number];

const toIsoString = (date: Date): string => {
  return date.toISOString();
};

const createBetweenFilter = (from: Date, to: Date): TimeRange => {
  return {
    operator: 'between',
    startTime: toIsoString(from),
    endTime: toIsoString(to),
  };
};

/**
 * `readRecords`를 pageToken이 끊길 때까지 이어 읽는다.
 *
 * 한 번의 호출은 허브가 정한 한도까지만 채워 주고 **에러 없이** 끊기므로, 그대로 쓰면
 * 장시간 산행의 심박 그래프 뒷부분이 조용히 잘린다.
 * 실패는 던져서 호출부의 catch가 로그와 함께 처리하게 둔다.
 */
const readAllRecords = async <T extends RecordType>(
  recordType: T,
  timeRangeFilter: TimeRange,
  scope: string
): Promise<RecordResult<T>[]> => {
  const collected: RecordResult<T>[] = [];
  let pageToken: string | undefined;
  let pageCount = 0;

  do {
    const options: ReadRecordsOptions = { timeRangeFilter };

    // exactOptionalPropertyTypes 때문에 undefined를 넣을 수 없어 있을 때만 붙인다.
    if (pageToken) {
      options.pageToken = pageToken;
    }

    const result = await readRecords(recordType, options);

    collected.push(...result.records);
    pageToken = result.pageToken;
    pageCount += 1;
  } while (pageToken && pageCount < MAX_RECORD_PAGES);

  if (pageToken) {
    logHealthError(
      `${scope} 페이지 상한(${MAX_RECORD_PAGES}) 도달 — 뒷부분이 잘렸다`,
      new Error(`${collected.length}건까지만 읽음`)
    );
  }

  return collected;
};

const convertLengthToMeters = (
  length: RouteLocation['altitude']
): number | undefined => {
  if (!length) {
    return undefined;
  }

  const factor = LENGTH_TO_METERS[length.unit];

  // 모르는 단위를 그대로 쓰면 조용히 틀린 숫자가 화면에 뜬다. 차라리 값을 비운다.
  if (factor === undefined) {
    return undefined;
  }

  return length.value * factor;
};

class HealthConnectService implements HealthService {
  // initialize()는 호출마다 네이티브 왕복이 나가므로 프로미스를 캐시해 한 번만 태운다.
  // 실패하면 캐시를 비워 다음 호출이 다시 시도하게 한다(권한 화면에서 돌아온 뒤 등).
  private initialization: Promise<boolean> | null = null;

  public static new = (): HealthConnectService => {
    return new HealthConnectService();
  };

  public isAvailable = (): boolean => {
    // 인터페이스가 동기라 여기서는 동기로 판정 가능한 조건까지만 본다.
    // Health Connect 제공자가 실제로 살아 있는지는 비동기(getSdkStatus)라
    // 정확한 판정은 getPermissionStatus()로 미룬다.
    return (
      Platform.OS === 'android' &&
      Number(Platform.Version) >= MIN_ANDROID_API_LEVEL
    );
  };

  public getPermissionStatus = async (): Promise<HealthPermissionStatus> => {
    if (!(await this.prepare())) {
      return HealthPermissionStatus.Unsupported;
    }

    try {
      const granted = await getGrantedPermissions();

      if (this.hasEssentialPermission(granted)) {
        return HealthPermissionStatus.Granted;
      }

      // Health Connect도 "아직 안 물어봄"과 "거부됨"을 조회만으로는 가르지 못한다.
      // 거부를 확정할 수 있는 건 requestPermission() 결과뿐이므로 여기서는 미결정으로 둔다.
      return HealthPermissionStatus.NotDetermined;
    } catch (error) {
      logHealthError('권한 상태 조회', error);

      return HealthPermissionStatus.NotDetermined;
    }
  };

  public requestPermission = async (): Promise<HealthPermissionStatus> => {
    if (!(await this.prepare())) {
      return HealthPermissionStatus.Unsupported;
    }

    try {
      // 읽기 권한만 넘긴다 — 쓰기는 기능상 불필요하고 심사에서도 문제가 된다(HA-2).
      const granted = await requestPermission([...READ_PERMISSIONS]);

      // iOS와 달리 허용된 권한 집합이 그대로 돌아와 거부를 정확히 판별할 수 있다.
      if (this.hasEssentialPermission(granted)) {
        return HealthPermissionStatus.Granted;
      }

      return HealthPermissionStatus.Denied;
    } catch (error) {
      logHealthError('권한 요청', error);

      return HealthPermissionStatus.Denied;
    }
  };

  public queryWorkouts = async ({
    from,
    to,
  }: HealthWorkoutQuery): Promise<HealthWorkout[]> => {
    if (!(await this.prepare())) {
      return [];
    }

    try {
      const records = await readAllRecords(
        'ExerciseSession',
        createBetweenFilter(from, to),
        '운동 세션 조회'
      );
      // 세션마다 aggregate가 여러 번 나가므로 순차로 돌리면 건수에 비례해 느려진다.
      const workouts = await Promise.all(
        records.map(record => this.mapWorkout(record))
      );

      // metadata.id가 없는 세션은 상세·연결(HA-5)에서 다시 찾을 방법이 없어 후보에서 뺀다.
      return workouts
        .filter((workout): workout is HealthWorkout => workout !== null)
        .sort(
          (left, right) => right.startDate.getTime() - left.startDate.getTime()
        );
    } catch (error) {
      logHealthError('운동 목록 조회', error);

      return [];
    }
  };

  public getRoute = async (
    workoutId: string
  ): Promise<HealthWorkoutRoute | null> => {
    if (!(await this.prepare())) {
      return null;
    }

    try {
      const route = await this.readRoute(workoutId);

      if (!route) {
        return null;
      }

      const points: HealthRoutePoint[] = route.route.map(location => {
        const point: HealthRoutePoint = {
          latitude: location.latitude,
          longitude: location.longitude,
          timestamp: new Date(location.time),
        };
        const altitudeMeters = convertLengthToMeters(location.altitude);

        // exactOptionalPropertyTypes가 켜져 있어 undefined 대입이 컴파일 에러다.
        // 값이 없으면 키 자체를 넣지 않는다.
        if (altitudeMeters !== undefined) {
          point.altitudeMeters = altitudeMeters;
        }

        return point;
      });

      // 실내 운동·가민 동기화 등 경로가 없는 기록이 흔하다. 빈 경로는 정상 결과다(HA-4).
      if (points.length === 0) {
        return null;
      }

      points.sort(
        (left, right) => left.timestamp.getTime() - right.timestamp.getTime()
      );

      return { workoutId, points };
    } catch (error) {
      // readRoute()가 조회 실패를 이미 null로 흡수하므로 여기 도달하는 건 위 매핑
      // (좌표 변환·정렬)의 JS 버그뿐이다. 그대로 두면 "경로 없음"으로 위장되므로
      // 값은 삼키되 로그로 구분한다.
      logHealthError('경로 매핑', error);

      return null;
    }
  };

  public getHeartRateSeries = async (
    workoutId: string
  ): Promise<HealthSeriesPoint[]> => {
    if (!(await this.prepare())) {
      return [];
    }

    let session: ExerciseSessionResult;

    // 세션 조회 실패와 심박 조회 실패는 원인이 전혀 다르다(전자는 저장된 id가 허브에서
    // 삭제된 레코드를 가리키는 실제 시나리오 — HA-5의 재매칭 대상). 같은 catch로 묶으면
    // 로그만 보고는 어느 쪽인지 알 수 없어 분리한다.
    try {
      session = await readRecord('ExerciseSession', workoutId);
    } catch (error) {
      logHealthError('심박용 세션 조회', error);

      return [];
    }

    try {
      const records = await readAllRecords(
        'HeartRate',
        // 심박은 워크아웃에 연결되지 않고 독립 레코드로 들어오므로 시간 구간으로만 거를 수 있다.
        createBetweenFilter(
          new Date(session.startTime),
          new Date(session.endTime)
        ),
        '심박 조회'
      );
      // HeartRateRecord 하나가 여러 샘플을 묶고 있어 평탄화해야 시계열이 된다.
      const points = records.flatMap(record =>
        record.samples.map(sample => ({
          timestamp: new Date(sample.time),
          value: sample.beatsPerMinute,
        }))
      );

      points.sort(
        (left, right) => left.timestamp.getTime() - right.timestamp.getTime()
      );

      return points;
    } catch (error) {
      logHealthError('심박 시계열 조회', error);

      return [];
    }
  };

  /**
   * SDK 사용 가능 여부 확인 + 최초 1회 초기화.
   * 모든 public 메서드가 네이티브를 건드리기 전에 통과해야 하는 관문이다.
   */
  private prepare = async (): Promise<boolean> => {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      // 제공자가 없거나 업데이트가 필요한 기기가 있어 상태를 매번 확인한다
      // (사용자가 도중에 Health Connect를 업데이트할 수 있다).
      const status = await getSdkStatus();

      if (status !== SdkAvailabilityStatus.SDK_AVAILABLE) {
        // 예외가 아니라 정상 반환이지만 로그는 남긴다 — 이 분기가 UI에서는 "기록 없음"과
        // 똑같이 보여, 제공자 미설치·업데이트 필요를 구분할 단서가 로그밖에 없다.
        logHealthError(
          'SDK 사용 불가',
          new Error(`getSdkStatus=${status} (SDK_AVAILABLE 아님)`)
        );

        return false;
      }

      if (!this.initialization) {
        this.initialization = initialize();
      }

      const initialized = await this.initialization;

      if (!initialized) {
        this.initialization = null;
      }

      return initialized;
    } catch (error) {
      logHealthError('SDK 초기화', error);
      this.initialization = null;

      return false;
    }
  };

  private hasEssentialPermission = (
    permissions: { accessType: string; recordType: string }[]
  ): boolean => {
    return permissions.some(
      permission =>
        permission.accessType === 'read' &&
        permission.recordType === ESSENTIAL_RECORD_TYPE
    );
  };

  /**
   * 경로는 `readRecord`의 `exerciseRoute`에 실려 올 때만 쓴다.
   *
   * **`requestExerciseRoute()`를 여기서 부르지 않는 것은 의도적이다.** 그 API는 레코드
   * 단위 시스템 동의 다이얼로그를 띄우는데, `getRoute()`는 `BagActivity.loadWorkoutDetail`이
   * 운동 상세를 열 때마다 자동으로 부른다. 사용자가 "경로 보기"를 누른 것도 아닌데
   * 상세 진입마다 다이얼로그가 뜨게 된다.
   *
   * 대가: `exerciseRoute`는 `READ_EXERCISE_ROUTES`(복수, 전체 경로) 권한을 가진 앱에만
   * 채워지는데 우리는 그 권한을 요청하지 않으므로(READ_PERMISSIONS 주석 참고),
   * **현재 구성에서 Android 경로 지도는 사실상 항상 비어 있다.** 이는 원치 않는
   * 다이얼로그보다 낫고, HA-4가 경로 없음을 이미 정상 상태로 안내한다(가민 사용자는
   * iOS에서도 같은 상황이다).
   *
   * 열어둔 선택지 — 나중에 경로가 필요해지면 둘 중 하나를 고른다. 어느 쪽이든 매니페스트
   * 권한 선언을 함께 되살려야 한다(`plugins/WithHealthConnectPermissions.js` 참고 —
   * 지금은 요청하지 않는 권한이라 선언에서도 빼 두었다).
   * 1. 상세에 "경로 불러오기" 버튼을 두고 **그 액션 뒤에서만** `requestExerciseRoute()`를
   *    부른다(`READ_EXERCISE_ROUTE`, 단수).
   * 2. `READ_EXERCISE_ROUTES`(복수)를 요청한다 — Google Play 별도 선언·심사가 필요하다.
   */
  private readRoute = async (
    workoutId: string
  ): Promise<ExerciseRouteResult | null> => {
    try {
      const session = await readRecord('ExerciseSession', workoutId);

      if (session.exerciseRoute && session.exerciseRoute.route.length > 0) {
        return session.exerciseRoute;
      }

      return null;
    } catch (error) {
      logHealthError('경로 조회', error);

      return null;
    }
  };

  private mapWorkout = async (
    session: ExerciseSessionResult
  ): Promise<HealthWorkout | null> => {
    const id = session.metadata?.id;

    if (!id) {
      return null;
    }

    const startDate = new Date(session.startTime);
    const endDate = new Date(session.endTime);
    const timeRangeFilter = createBetweenFilter(startDate, endDate);
    // 지표가 세션에 붙어 있지 않아 구간 aggregate로 채운다. 4건이 서로 독립이라 병렬로 던진다.
    //
    // 한계: aggregate는 구간에 걸친 **모든** 레코드를 합치므로, 같은 시간대에 다른 운동이
    // 겹쳐 기록돼 있으면 값이 섞인다. 레코드를 세션에 귀속시키는 API가 없어 피할 수 없다.
    //
    // 세션당 4회라 호출이 4N으로 늘지만, 조회 기간이 배낭 여행 기간(보통 1~3일)으로
    // 한정돼 **N이 10건 미만이라는 전제**에서 문제가 되지 않는다. 조회 기간이 넓어지면
    // (전체 목록에서 고르기 등) 레코드를 한 번에 읽고 JS에서 버킷팅하는 쪽으로 재검토한다.
    const [distance, elevation, calories, duration] = await Promise.all([
      this.readAggregate('Distance', timeRangeFilter),
      this.readAggregate('ElevationGained', timeRangeFilter),
      this.readAggregate('ActiveCaloriesBurned', timeRangeFilter),
      this.readAggregate('ExerciseSession', timeRangeFilter),
    ]);
    const wallClockSeconds = (endDate.getTime() - startDate.getTime()) / 1000;
    const workout: HealthWorkout = {
      id,
      type:
        WORKOUT_TYPE_BY_EXERCISE_TYPE[session.exerciseType] ??
        HealthWorkoutType.Other,
      startDate,
      endDate,
      // EXERCISE_DURATION_TOTAL은 일시정지·휴식 세그먼트를 제외한 값이라 도메인 타입의
      // 정의(일시정지 제외)와 맞는다.
      //
      // 다만 위 aggregate 한계 때문에 **이 세션의 값이라는 보장이 없다** — 구간에 걸친
      // 다른 세션까지 합산되면 세션의 실제 경과 시간을 넘어설 수 있다. 벽시계 시간으로
      // 클램프해 상한을 보장한다(일시정지 제외 의미는 그대로 유지된다).
      //
      // 타입상 EXERCISE_DURATION_TOTAL은 optional이 아니지만, 네이티브가 키를 빠뜨려도
      // 화면 전체가 죽지 않도록 `?.`로 방어하고 벽시계 시간으로 떨어뜨린다.
      durationSeconds: Math.min(
        duration?.EXERCISE_DURATION_TOTAL?.inSeconds ?? wallClockSeconds,
        wallClockSeconds
      ),
    };
    const distanceMeters = distance?.DISTANCE?.inMeters;

    // 아래 세 지표는 도메인 타입에서 optional이다. exactOptionalPropertyTypes 때문에
    // undefined를 대입할 수 없어, 값이 있을 때만 키를 만든다.
    if (distanceMeters !== undefined) {
      workout.distanceMeters = distanceMeters;
    }

    const elevationAscendedMeters = elevation?.ELEVATION_GAINED_TOTAL?.inMeters;

    if (elevationAscendedMeters !== undefined) {
      workout.elevationAscendedMeters = elevationAscendedMeters;
    }

    const activeEnergyKilocalories =
      calories?.ACTIVE_CALORIES_TOTAL?.inKilocalories;

    if (activeEnergyKilocalories !== undefined) {
      workout.activeEnergyKilocalories = activeEnergyKilocalories;
    }

    return workout;
  };

  private readAggregate = async <T extends AggregateResultRecordType>(
    recordType: T,
    timeRangeFilter: TimeRange
  ): Promise<AggregateResult<T> | undefined> => {
    try {
      // 권한 없음·데이터 없음은 정상 상황이라 지표 하나가 비는 것으로 처리하고 나머지
      // 조회를 막지 않는다. 다만 이 catch는 그 둘만이 아니라 **모든** 실패(네이티브 계약
      // 변경, 잘못된 recordType 등)를 함께 삼키므로, 원인 구분은 로그로만 가능하다.
      // 세션당 4회 × N세션이라 계약이 어긋나면 여기서 수백 건이 쏟아진다.
      return await aggregateRecord({ recordType, timeRangeFilter });
    } catch (error) {
      logHealthError(`지표 집계(${recordType})`, error);

      return undefined;
    }
  };
}

export default HealthConnectService;
