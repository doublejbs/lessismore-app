// 코스의 두 끝 — 지금 보는 방향 기준이다(뒤집으면 원래의 끝점이 `Start`다, GRP-8).
enum RouteEndpointKind {
  Start = 'start',
  End = 'end',
}

export default RouteEndpointKind;
