/** 리플레이 실패 이유(RR-3 · RR-4 `route_replay_failed.reason`). */
enum RouteReplayFailReason {
  Timeout = 'timeout',
  WebError = 'web_error',
  HttpError = 'http_error',
}

export default RouteReplayFailReason;
