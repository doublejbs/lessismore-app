// 코스가 어떻게 만들어졌는지 (DM-29·DM-30 `source`, RouteDraw RD-7 2026-10-14). 문서 값이 그대로 이 문자열이다.
// 키가 없으면 GPX 가져오기다 — 가져온 코스에는 이 값을 쓰지 않는다(보안 규칙이 `'drawn'`만 받는다).
enum RouteSource {
  // 지도에서 점을 찍어 그린 코스(RD-1 ~ RD-7). 찍은 점(`drawnPoints`)을 함께 남겨 다시 열어 고칠 수 있다.
  Drawn = 'drawn',
}

export default RouteSource;
