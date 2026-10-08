// 3단계에서 장비를 담은 경로(OB-6, OB-9 `click_onboarding_trip_gear_pick.source`).
enum OnboardingTripGearSource {
  // 인기 장비 행 토글(gear-rank).
  Popular = 'popular',
  // 창고 체크리스트 토글.
  Warehouse = 'warehouse',
  // 검색 모달에서 창고에 등록한 뒤 돌아와 자동 선택.
  Search = 'search',
  // 직접 추가(수동 폼) 저장 뒤 돌아와 자동 선택.
  Custom = 'custom',
}

export default OnboardingTripGearSource;
