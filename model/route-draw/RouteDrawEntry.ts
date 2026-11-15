/**
 * 새로 그리기에 들어온 길 (RD-9 측정 — `click_route_draw_start`의 `entry`). 측정 값이 그대로 이 문자열이다.
 * 그린 코스 수정(RD-7)은 따로 `click_route_draw_edit_start`를 남기므로 여기에 두지 않는다.
 */
enum RouteDrawEntry {
  // 코스 화면 빈 상태 카드 `지도에서 그리기`(RD-9 #1).
  EmptyCard = 'empty_card',
  // 시트 푸터 `코스 추가` → 메뉴 `지도에서 그리기`(RD-1).
  Menu = 'menu',
  // 여행 상세 상황형 강조 `코스`(RD-9 #4)를 거쳐 온 빈 상태 카드 `지도에서 그리기`.
  Highlight = 'highlight',
}

export default RouteDrawEntry;
