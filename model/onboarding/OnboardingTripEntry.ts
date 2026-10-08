// 탭 도착 판정 결과 — 레이아웃이 띄울 화면(OB-1·OB-11·OB-15).
enum OnboardingTripEntry {
  // 띄우지 않음.
  None = 'none',
  // 환영 화면 먼저(이 기기 첫 판정, OB-14).
  Welcome = 'welcome',
  // 가이드 바로(이어가기 OB-12 · 이 기기에서 환영 화면을 이미 본 로그인 사용자).
  Guide = 'guide',
}

export default OnboardingTripEntry;
