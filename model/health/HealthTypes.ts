import HealthWorkoutType from './HealthWorkoutType';

// 운동 기록(HA) 도메인의 플랫폼 중립 타입.
// iOS(HealthKit) / Android(Health Connect) 어느 쪽 개념도 여기 새면 안 된다 —
// 앱 코드는 이 타입들과 `HealthService` 인터페이스만 본다.
//
// 단위는 전 구간 SI로 고정한다. 플랫폼 SDK가 돌려주는 단위(mi, ft, kJ 등)는
// 각 구현체가 변환해서 넣는다. 표시 단위 변환(km 등)은 UI 책임이다.

/** 건강 허브에서 읽어온 운동 하나(HA-3 후보 · HA-4 상세). */
export interface HealthWorkout {
  /** 플랫폼 고유 식별자. iOS는 샘플 UUID. 이 값만 Firestore에 참조로 저장한다(HA-5). */
  id: string;
  type: HealthWorkoutType;
  startDate: Date;
  endDate: Date;
  /** 소요 시간(초). 일시정지 구간이 빠져 endDate-startDate와 다를 수 있다. */
  durationSeconds: number;
  /** 이동 거리(m). 실내 운동 등 거리 없는 기록이면 없다. */
  distanceMeters?: number;
  /** 누적 상승고도(m). 고도계 없는 기기로 기록했으면 없다. */
  elevationAscendedMeters?: number;
  /** 활동 에너지(kcal). 기록원이 계산하지 않았으면 없다. */
  activeEnergyKilocalories?: number;
}

/** GPS 경로의 한 점. */
export interface HealthRoutePoint {
  latitude: number;
  longitude: number;
  timestamp: Date;
  /** 해발고도(m). 기기가 제공하지 않으면 없다. */
  altitudeMeters?: number;
}

/**
 * 운동의 GPS 경로(HA-4 경로 지도).
 * 실내 운동처럼 경로가 없는 기록도 흔하므로 조회 결과는 `null`일 수 있다.
 */
export interface HealthWorkoutRoute {
  workoutId: string;
  /** 시간 오름차순으로 정렬된 좌표. */
  points: HealthRoutePoint[];
}

/** 심박·페이스 같은 시계열 한 점(HA-4 그래프). */
export interface HealthSeriesPoint {
  timestamp: Date;
  value: number;
}

/** 후보 운동 조회 기간(HA-3). 위치 기반 좁히기는 상위 도메인이 처리한다. */
export interface HealthWorkoutQuery {
  from: Date;
  to: Date;
}
