// 장비 추가 선택 시트(GE-8)의 진입 컨텍스트 파라미터(`context=`). 없으면 창고 또는 배낭(bagId 유무로 판단).
enum GearAddContextType {
  // 템플릿 편집 — 배낭이 아니라 날짜·여행지가 없어 AI 추천 행을 두지 않는다(AS §2 진입 2).
  Template = 'template',
}

export default GearAddContextType;
