// 첫 여행 만들기 가이드 단계(OB-3). 값은 분석 `step` 파라미터로도 쓴다(OB-9).
// 날짜 단계(`date`)는 2026-10-15 폐기했다(OB-4).
enum OnboardingTripStep {
  Destination = 'destination',
  Gear = 'gear',
  Done = 'done',
  // 분석 전용 — 화면 단계가 아니다. 비로그인 완료 단계의 로그인 버튼 둘(OB-11, OB-9 `step: login`).
  Login = 'login',
}

export default OnboardingTripStep;
