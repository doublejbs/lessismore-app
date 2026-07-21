import { Platform } from 'react-native';
import HealthKitService from './HealthKitService';
import HealthPermissionStatus from './HealthPermissionStatus';
import {
  HealthSeriesPoint,
  HealthWorkout,
  HealthWorkoutQuery,
  HealthWorkoutRoute,
} from './HealthTypes';

// 운동 기록(HA)의 플랫폼 공용 인터페이스 + 팩토리.
// iOS(HealthKit) / Android(Health Connect)는 API가 완전히 달라 구현으로 가른다.
// 앱 코드는 이 인터페이스만 참조한다 — 플랫폼 SDK 타입이 위로 새면 안 된다.
//
// **읽기 전용 계약이다.** 건강 허브에 쓰는 메서드를 여기 추가하지 않는다(HA-2).

export interface HealthService {
  /** 이 기기·플랫폼에서 건강 허브를 쓸 수 있는지. 진입점 노출 판단용(HA-1). */
  isAvailable(): boolean;

  /** 권한 시트를 띄우지 않고 현재 상태만 조회한다. */
  getPermissionStatus(): Promise<HealthPermissionStatus>;

  /** 권한 시트를 띄운다. 타일을 탭한 시점에만 호출한다(HA-2). */
  requestPermission(): Promise<HealthPermissionStatus>;

  /** 기간 내 운동을 최신순으로 조회한다. 권한이 없으면 빈 배열(HA-3). */
  queryWorkouts(params: HealthWorkoutQuery): Promise<HealthWorkout[]>;

  /** GPS 경로. 실내 운동 등 경로가 없으면 null(HA-4). */
  getRoute(workoutId: string): Promise<HealthWorkoutRoute | null>;

  /** 심박 시계열. 데이터가 없으면 빈 배열(HA-4). */
  getHeartRateSeries(workoutId: string): Promise<HealthSeriesPoint[]>;
}

/**
 * 건강 허브가 없는 플랫폼(웹)과 아직 구현이 없는 플랫폼(Android)용 스텁.
 *
 * 호출부가 플랫폼 분기 없이 쓸 수 있도록 예외 대신 "없음"을 돌려준다.
 * Android에 Health Connect 구현(`HealthConnectService`)이 생기면
 * 아래 팩토리의 분기 한 줄만 고치면 된다.
 */
class UnsupportedHealthService implements HealthService {
  public static new = (): UnsupportedHealthService => {
    return new UnsupportedHealthService();
  };

  public isAvailable = (): boolean => {
    return false;
  };

  public getPermissionStatus = async (): Promise<HealthPermissionStatus> => {
    return HealthPermissionStatus.Unsupported;
  };

  public requestPermission = async (): Promise<HealthPermissionStatus> => {
    return HealthPermissionStatus.Unsupported;
  };

  public queryWorkouts = async (): Promise<HealthWorkout[]> => {
    return [];
  };

  public getRoute = async (): Promise<HealthWorkoutRoute | null> => {
    return null;
  };

  public getHeartRateSeries = async (): Promise<HealthSeriesPoint[]> => {
    return [];
  };
}

const createHealthService = (): HealthService => {
  if (Platform.OS === 'ios') {
    return HealthKitService.new();
  }

  // Android는 Health Connect 구현이 들어오기 전까지 미지원으로 둔다(스펙 5. 플랫폼 분기).
  return UnsupportedHealthService.new();
};

// 플랫폼 판정은 런타임 내내 바뀌지 않으므로 인스턴스를 한 번만 만든다.
let instance: HealthService | null = null;

export const getHealthService = (): HealthService => {
  if (!instance) {
    instance = createHealthService();
  }

  return instance;
};
