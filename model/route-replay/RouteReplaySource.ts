/** 3D 리플레이를 연 곳(RR-1·RR-4 `source`). */
enum RouteReplaySource {
  Route = 'route',
  Activity = 'activity',
  // 그룹 지도(GRP-10) 우하단 `3D`.
  Group = 'group',
  // 여행 상세 코스 카드(RD-9 #5) `3D로 보기`.
  BagCard = 'bag_card',
}

export default RouteReplaySource;
