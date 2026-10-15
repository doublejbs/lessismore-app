// 그린 코스가 사는 곳 (RD-8 `claimFreeRouteDraw`·`routeTrail editing`의 `kind`, DM-36 `freeRoute.kind`). 값이 그대로 이 문자열이다.
enum RouteDrawTargetKind {
  // 배낭 코스 `bag/{bagId}/routes/{routeId}`(DM-30).
  Bag = 'bag',
  // 그룹 코스 `groups/{groupId}/routes/{routeId}`(DM-29).
  Group = 'group',
}

export default RouteDrawTargetKind;
