// OF-6: 지도 대신 코스 캔버스를 그리는 이유. 상단 한 줄 문구와 측정 값이 갈린다.
enum OfflineCanvasReason {
  // 연결이 없다 — `오프라인 · 지도는 연결되면 보여요`.
  Offline = 'offline',
  // 온라인이지만 지도가 뜨지 않았다(키 오류·SDK 오류) — 캔버스는 "지도가 없을 때의 코스 뷰"다.
  MapUnavailable = 'map_unavailable',
}

export default OfflineCanvasReason;
