// 장비 추가 선택 시트의 행(GE-8). `AiFill`은 배낭 컨텍스트에만 둔다(AS §2 진입 2).
enum GearAddOptionType {
  Search = 'search',
  Custom = 'custom',
  AiFill = 'ai_fill',
}

export default GearAddOptionType;
