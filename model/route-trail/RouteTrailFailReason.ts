// 등산로 따라 잇기가 직선으로 대체된 이유 (RD-6). 측정 `route_trail_fail`의 `reason` 값이 그대로 이 문자열이다.
enum RouteTrailFailReason {
  // 서버가 두 점 사이 길을 찾지 못했다(길 정보가 없는 바다·논 등).
  NotFound = 'not_found',
  // 8초 안에 응답이 오지 않았다.
  Timeout = 'timeout',
  // 함수 호출 실패·한도 초과·응답 모양 이상.
  Error = 'error',
  // 오프라인이라 요청하지 않았다.
  Offline = 'offline',
  // 직선 거리가 20km를 넘어 요청하지 않았다.
  TooFar = 'too_far',
}

export default RouteTrailFailReason;
