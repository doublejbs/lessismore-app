/**
 * 지도에서 찍은 점 하나 (RD-2). 지도 탭 좌표(`AppMapCoordinate`)와 같은 모양이라 그대로 받는다 —
 * 코스 데이터(`RouteCoordinate` lat/lng)로는 저장할 때 한 번만 바꾼다.
 */
export interface RouteDrawPoint {
  latitude: number;
  longitude: number;
}
