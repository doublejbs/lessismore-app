// 가이드 여행지가 들어온 경로(OB-5, OB-9 `click_onboarding_trip_complete.destination_source`).
enum OnboardingDestinationSource {
  // 2단계 `요즘 많이 가는 박지` 칩.
  Chip = 'chip',
  // 공용 여행지 선택기(DST-3) — 박지 상세 시트 CTA 포함.
  Picker = 'picker',
  // 여행지 없음.
  None = 'none',
}

export default OnboardingDestinationSource;
