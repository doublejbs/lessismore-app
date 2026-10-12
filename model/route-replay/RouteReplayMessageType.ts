/** RN ↔ 웹뷰 메시지 종류(RR-2). 웹 문서(`RouteReplayHtml.ts`)도 같은 문자열을 쓴다. */
enum RouteReplayMessageType {
  // RN → 웹
  Load = 'load',
  // 웹 → RN
  Ready = 'ready',
  Error = 'error',
  Play = 'play',
  Finished = 'finished',
}

export default RouteReplayMessageType;
