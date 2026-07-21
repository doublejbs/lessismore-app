import {
  HealthSeriesPoint,
  HealthWorkout,
  HealthWorkoutRoute,
} from '../health/HealthTypes';

/**
 * 연결된 운동 한 건의 상세(HA-4).
 *
 * 전부 기기에서 표시 시점에 읽은 값이며 Firestore에 저장하지 않는다(HA-5).
 * 경로·심박·페이스는 각각 없을 수 있고, 없는 항목은 해당 UI를 통째로 생략한다.
 */
export interface BagActivityWorkoutDetail {
  workout: HealthWorkout;
  /** GPS 경로. 실내 운동이거나 경로 권한이 없으면 null. */
  route: HealthWorkoutRoute | null;
  /** 심박 시계열. 기록원이 심박을 남기지 않았으면 빈 배열. */
  heartRateSeries: HealthSeriesPoint[];
  /** 경로에서 파생한 페이스 시계열. 경로가 없거나 전 구간 정지면 빈 배열. */
  paceSeries: HealthSeriesPoint[];
}
