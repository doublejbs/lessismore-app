// 여행지 선택기의 거리 판정(BagDestination DST-3/DST-4)용 좌표 유틸.
// 박지 링크 해제(약 100m 이탈)·박지/장소 중복 제거처럼 미터 단위 임계를 다루므로
// 위경도 차이 근사 대신 하버사인으로 실제 거리를 구한다.

export interface Coordinate {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_METERS = 6371000;

const toRadians = (degrees: number): number => {
  return (degrees * Math.PI) / 180;
};

export const getDistanceInMeters = (a: Coordinate, b: Coordinate): number => {
  const latDelta = toRadians(b.latitude - a.latitude);
  const lngDelta = toRadians(b.longitude - a.longitude);
  const h =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) *
      Math.cos(toRadians(b.latitude)) *
      Math.sin(lngDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
};
