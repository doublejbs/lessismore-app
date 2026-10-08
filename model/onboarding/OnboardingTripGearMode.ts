// 3단계 장비 담기 모드(OB-6). 단계에 처음 들어올 때 창고 상태로 한 번 정한다.
enum OnboardingTripGearMode {
  // 창고에 장비가 있음 — 카테고리별 체크리스트 + 그 아래 인기 장비 구획.
  Warehouse = 'warehouse',
  // 창고가 비어 있음 — 필수 4종 인기 장비 구획만.
  Popular = 'popular',
}

export default OnboardingTripGearMode;
