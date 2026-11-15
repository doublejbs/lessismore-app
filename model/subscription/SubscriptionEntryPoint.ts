// SUB-8·SUB-9: 구독 화면을 연 자리(`subscription_open`의 `from` 값과 같다).
enum SubscriptionEntryPoint {
  // 설정(정보 탭) `useless 플러스` 행.
  Settings = 'settings',
  // 한 장짜리 광고(홈·장비 상세) 아래 `광고 없이 보기` 링크.
  AdCard = 'ad_card',
  // 광고 누적 노출 뒤 한 번 뜨는 안내 시트의 `구독 알아보기`.
  Nudge = 'nudge',
  // 배낭 상세 `오프라인` 타일 게이트(SUB-11 · OF-2). 구매에 성공하면 그 여행의 저장을 바로 시작한다.
  Offline = 'offline',
  // 코스 그리기 게이트(SUB-12 · RouteDraw RD-8) — 새로 그리기·무료 코스가 아닌 그린 코스 수정·길 따라 거절.
  // 권한을 얻으면 하려던 일(그리기 시작·수정 시작)을 바로 잇는다.
  RouteDraw = 'route_draw',
  // 지도 종류 메뉴의 `위성`(SUB-13 · Map MAP-7). 권한을 얻으면 그 지도를 바로 위성으로 바꾼다.
  Satellite = 'satellite',
  // 라우트 파라미터가 없을 때 결과 이벤트용(SUB-8).
  Unknown = 'unknown',
}

export default SubscriptionEntryPoint;
