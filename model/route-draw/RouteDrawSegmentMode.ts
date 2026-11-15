// 그리는 코스의 구간 하나가 이어진 방식 (RD-6). 저장 데이터에는 남기지 않는다 — 측정 개수만 센다.
enum RouteDrawSegmentMode {
  // 등산로를 따라 이었다(라우팅 함수 `routeTrail`의 길 좌표).
  Trail = 'trail',
  // 두 점을 직선으로 이었다(토글 끔·길 찾기 실패·20km 초과·오프라인).
  Straight = 'straight',
}

export default RouteDrawSegmentMode;
