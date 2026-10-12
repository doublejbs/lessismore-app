import { RouteBounds } from '@/model/route/RouteData';

// MapLibre 영역 순서 `[west, south, east, north]`(`@maplibre/maplibre-react-native`의 `LngLatBounds`와 같다).
// 지도 패키지를 import하지 않게 같은 모양을 여기 둔다 — 이 파일은 저장 흐름(웹 포함)에서도 읽힌다.
export type OfflineLngLatBounds = [number, number, number, number];

// 위도 1°의 길이(m)와 적도에서 경도 1°의 길이(m). 코스 한 벌(수십 km) 범위에서는 평면 근사로 충분하다.
const METERS_PER_LAT_DEGREE = 110540;
const METERS_PER_LNG_DEGREE_AT_EQUATOR = 111320;
// 코스·포인트 상자를 사방으로 넓히는 최소 거리(m)와 상자 폭 대비 비율(OF-1 — 둘 중 큰 값).
const MIN_MARGIN_METERS = 2000;
const MARGIN_RATIO = 0.2;
// 코스·포인트가 없을 때 여행지 좌표 둘레로 잡는 반경(m).
const FALLBACK_RADIUS_METERS = 3000;
// 극지방에서 cos(lat)이 0에 가까워 경도 폭이 터지지 않게 막는 하한.
const MIN_COS_LAT = 0.01;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const getMetersPerLngDegree = (lat: number): number => {
  return (
    METERS_PER_LNG_DEGREE_AT_EQUATOR *
    Math.max(MIN_COS_LAT, Math.cos(toRadians(lat)))
  );
};

const clampLat = (lat: number) => Math.max(-85, Math.min(85, lat));
const clampLng = (lng: number) => Math.max(-180, Math.min(180, lng));

const toLngLatBounds = (
  minLat: number,
  maxLat: number,
  minLng: number,
  maxLng: number
): OfflineLngLatBounds => {
  return [
    clampLng(minLng),
    clampLat(minLat),
    clampLng(maxLng),
    clampLat(maxLat),
  ];
};

/**
 * 오프라인 지도 팩 영역 (OF-1). 코스·포인트 상자를 **사방으로 최소 2km 또는 상자 폭의 20%**(큰 쪽)만큼
 * 넓힌다. 상자가 없으면 여행지(박지·위치) 좌표 ±3km, 그것도 없으면 `null`(팩을 만들지 않는다).
 */
export const getOfflineMapBounds = (
  content: RouteBounds | null,
  fallback: { lat: number; lng: number } | null
): OfflineLngLatBounds | null => {
  if (content) {
    const centerLat = (content.minLat + content.maxLat) / 2;
    const metersPerLng = getMetersPerLngDegree(centerLat);
    const heightMeters =
      (content.maxLat - content.minLat) * METERS_PER_LAT_DEGREE;
    const widthMeters = (content.maxLng - content.minLng) * metersPerLng;
    const latMarginMeters = Math.max(
      MIN_MARGIN_METERS,
      heightMeters * MARGIN_RATIO
    );
    const lngMarginMeters = Math.max(
      MIN_MARGIN_METERS,
      widthMeters * MARGIN_RATIO
    );
    const latMargin = latMarginMeters / METERS_PER_LAT_DEGREE;
    const lngMargin = lngMarginMeters / metersPerLng;

    return toLngLatBounds(
      content.minLat - latMargin,
      content.maxLat + latMargin,
      content.minLng - lngMargin,
      content.maxLng + lngMargin
    );
  }

  if (fallback) {
    const latMargin = FALLBACK_RADIUS_METERS / METERS_PER_LAT_DEGREE;
    const lngMargin =
      FALLBACK_RADIUS_METERS / getMetersPerLngDegree(fallback.lat);

    return toLngLatBounds(
      fallback.lat - latMargin,
      fallback.lat + latMargin,
      fallback.lng - lngMargin,
      fallback.lng + lngMargin
    );
  }

  return null;
};

// `inner`가 `outer` 안에 다 들어오는지(OF-2 자동 갱신 — 영역이 그대로면 팩을 다시 받지 않는다).
export const isLngLatBoundsInside = (
  inner: OfflineLngLatBounds,
  outer: OfflineLngLatBounds
): boolean => {
  return (
    inner[0] >= outer[0] &&
    inner[1] >= outer[1] &&
    inner[2] <= outer[2] &&
    inner[3] <= outer[3]
  );
};

export const isOfflineLngLatBounds = (
  value: unknown
): value is OfflineLngLatBounds => {
  return (
    Array.isArray(value) &&
    value.length === 4 &&
    value.every(item => typeof item === 'number' && Number.isFinite(item))
  );
};
