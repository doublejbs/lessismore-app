// 시트 진입 위치(AS-11 `ai_gear_fill_open.from`).
enum AiGearFillEntrySource {
  // 빈 배낭 상세의 보조 알약(BD-13)
  EmptyBag = 'empty_bag',
  // 장비 추가 선택 시트의 세 번째 행(GE-8)
  GearAdd = 'gear_add',
}

export default AiGearFillEntrySource;
