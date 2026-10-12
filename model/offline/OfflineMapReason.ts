// OF-6: 네이버 지도 대신 오프라인 지도(MapLibre 팩)를 그리는 이유. 상단 한 줄 문구와 측정 값이 갈린다.
// 값은 애널리틱스 파라미터로 나가므로 바꾸지 않는다.
enum OfflineMapReason {
  // 연결이 없다 — `오프라인 · 지도는 연결되면 보여요`.
  Offline = 'offline',
  // 온라인이지만 네이버 지도가 뜨지 않았다(키 오류·SDK 오류) — 오프라인 지도가 "온라인 지도가 없을 때의 코스 뷰"다.
  MapUnavailable = 'map_unavailable',
}

export default OfflineMapReason;
