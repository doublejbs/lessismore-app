/**
 * 배낭 여행에 연결할 수 있는 운동 종류(HA-3).
 *
 * OS 건강 허브의 운동 종류는 수십 가지(iOS `HKWorkoutActivityType` 80여 개,
 * Health Connect도 별도 체계)라 그대로 노출하면 플랫폼 개념이 앱으로 샌다.
 * UL 백패킹 맥락에서 의미 있는 4가지만 남기고 나머지는 `Other`로 접는다.
 */
enum HealthWorkoutType {
  Hiking = 'hiking',
  Walking = 'walking',
  Running = 'running',
  Cycling = 'cycling',
  Other = 'other',
}

export default HealthWorkoutType;
