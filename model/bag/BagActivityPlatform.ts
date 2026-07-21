/**
 * 운동 기록을 읽어온 건강 허브(DM-22 `activity.platform`).
 *
 * `workoutIds`는 허브별 로컬 식별자 체계라 어느 소스에서 연결했는지 함께 저장해야
 * 다른 플랫폼에서 열었을 때 해석 불가를 판단할 수 있다.
 */
enum BagActivityPlatform {
  HealthKit = 'healthkit',
  HealthConnect = 'healthconnect',
}

export default BagActivityPlatform;
