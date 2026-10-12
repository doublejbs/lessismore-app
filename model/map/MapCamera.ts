import type { LngLatBounds } from '@maplibre/maplibre-react-native';
import { RouteCameraRegion } from '@/model/route/RouteCamera';
import { RouteBounds } from '@/model/route/RouteData';
import { deltaToZoom } from './MapZoom';

/**
 * 지도 카메라 유틸 (MAP-2). MapLibre는 영역을 `[west, south, east, north]`로, 앱 코스 데이터는
 * `RouteBounds {minLat, maxLat, minLng, maxLng}`·`RouteCameraRegion`(남서 모서리 + 스팬)으로 다룬다 —
 * 그 사이 변환을 한 곳에 둔다. (타입만 import한다 — 이 파일은 MapLibre 네이티브 모듈을 싣지 않는다.)
 */

// 남한 전역이 보이는 폴백 카메라(위치 권한 거부/미결정·내용 없음).
// 중심 = 남한 중앙, 줌 = 기존 latitudeDelta 4.8 등가(iPhone 세로 ~850dp 기준 zoom ≈ 8).
export const KOREA_CAMERA = {
  latitude: 36.2,
  longitude: 127.9,
  zoom: deltaToZoom(4.8),
};

// `내 위치`로 옮길 때 보이는 위도 스팬(도) — 배낭 코스 지도(BD-11)의 값.
export const CURRENT_LOCATION_DELTA = 0.05;

// 남서 모서리 + 스팬 영역(`RouteCameraRegion` — `[이력]` 네이버 `animateRegionTo`의 모양) → `[w, s, e, n]`.
export const regionToLngLatBounds = (
  region: RouteCameraRegion
): LngLatBounds => [
  region.longitude,
  region.latitude,
  region.longitude + region.longitudeDelta,
  region.latitude + region.latitudeDelta,
];

export const boundsToLngLatBounds = (bounds: RouteBounds): LngLatBounds => [
  bounds.minLng,
  bounds.minLat,
  bounds.maxLng,
  bounds.maxLat,
];

export const lngLatBoundsToRouteBounds = (
  bounds: readonly [number, number, number, number]
): RouteBounds => ({
  minLng: bounds[0],
  minLat: bounds[1],
  maxLng: bounds[2],
  maxLat: bounds[3],
});
