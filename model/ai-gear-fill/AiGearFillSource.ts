// 추천 장비 출처(AS-13). v1 결과는 전부 창고(`warehouse`)다 — `catalog`는 서버 계약의 예비 값으로만 받아 두고
// 화면에 표시하지 않는다(AS-14, 2026-10-31).
enum AiGearFillSource {
  Warehouse = 'warehouse',
  Catalog = 'catalog',
}

export default AiGearFillSource;
