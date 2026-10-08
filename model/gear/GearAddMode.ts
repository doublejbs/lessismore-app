// GE-8: 장비 추가 검색(/search)으로 진입했을 때 검색 결과 담기 동작의 대상.
enum GearAddMode {
  Warehouse = 'warehouse',
  Bag = 'bag',
  // 첫 여행 가이드 비로그인 담기(OB-13) — 쓰기 없이 고른 장비를 호출 화면에 돌려준다.
  Pick = 'pick',
}

export default GearAddMode;
