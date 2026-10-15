// MAP-7: 지도 종류 전환 버튼이 있는 화면 — 측정 `click_map_layer`의 `screen` 값.
enum MapLayerScreen {
  // 배낭 코스(BD-11).
  BagRoute = 'bag_route',
  // 그룹 지도(GRP-10).
  GroupMap = 'group_map',
  // 박지 지도(CS-1).
  CampMap = 'camp_map',
  // 3D 리플레이(RR-2).
  RouteReplay = 'route_replay',
}

export default MapLayerScreen;
