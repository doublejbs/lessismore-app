import { RouteBounds } from './RouteData';

/**
 * 코스 지도의 카메라 맞춤 (GRP-8·GRP-10, BD-11).
 *
 * 그룹 지도와 배낭 코스 지도가 **같은 계산**을 쓴다 — 최초 카메라(목록·포인트 전체 상자)와
 * 코스를 고를 때의 카메라(그 코스 상자)가 한 규칙이어야 두 화면에서 같은 여백으로 보인다.
 */

// 위경도 한 점. 코스 좌표(`RouteCoordinate`)와 포인트 좌표를 같은 모양으로 받는다.
interface BoundsCoordinate {
  lat: number;
  lng: number;
}

// `animateRegionTo`가 받는 영역 — **남서(좌하단) 모서리** + 위경도 스팬이다.
export interface RouteCameraRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

/** 경계 상자가 화면 가장자리에 붙지 않도록 주는 여유 배율. */
const CAMERA_PADDING_RATIO = 1.3;

/** 최소 표시 범위(도). 아주 짧은 코스·포인트 하나는 상자가 0에 가까워 최대 줌으로 붙어 버린다. */
const MIN_REGION_DELTA = 0.004;

// 좌표들의 경계 상자. 비어 있으면 `null`이다. 코스마다 500점까지라 전개 인자 대신 한 번 훑는다.
export const measureRouteBounds = (
  coordinates: readonly BoundsCoordinate[]
): RouteBounds | null => {
  if (coordinates.length === 0) {
    return null;
  }

  const bounds: RouteBounds = {
    minLat: coordinates[0].lat,
    maxLat: coordinates[0].lat,
    minLng: coordinates[0].lng,
    maxLng: coordinates[0].lng,
  };

  coordinates.forEach(coordinate => {
    bounds.minLat = Math.min(bounds.minLat, coordinate.lat);
    bounds.maxLat = Math.max(bounds.maxLat, coordinate.lat);
    bounds.minLng = Math.min(bounds.minLng, coordinate.lng);
    bounds.maxLng = Math.max(bounds.maxLng, coordinate.lng);
  });

  return bounds;
};

// 여러 상자를 모두 담는 상자. `null`은 건너뛰고, 남는 것이 없으면 `null`이다.
export const mergeRouteBounds = (
  list: readonly (RouteBounds | null)[]
): RouteBounds | null => {
  return list.reduce<RouteBounds | null>((merged, bounds) => {
    if (!bounds) {
      return merged;
    }

    if (!merged) {
      return { ...bounds };
    }

    return {
      minLat: Math.min(merged.minLat, bounds.minLat),
      maxLat: Math.max(merged.maxLat, bounds.maxLat),
      minLng: Math.min(merged.minLng, bounds.minLng),
      maxLng: Math.max(merged.maxLng, bounds.maxLng),
    };
  }, null);
};

/**
 * 상자가 여백을 두고 화면에 들어오는 카메라 영역. 여유 배율만큼 넓힌 만큼 남서 모서리도 같이
 * 밀어 중심을 상자 중심에 유지한다.
 */
export const getRouteFitRegion = (bounds: RouteBounds): RouteCameraRegion => {
  const latitudeDelta = Math.max(
    (bounds.maxLat - bounds.minLat) * CAMERA_PADDING_RATIO,
    MIN_REGION_DELTA
  );
  const longitudeDelta = Math.max(
    (bounds.maxLng - bounds.minLng) * CAMERA_PADDING_RATIO,
    MIN_REGION_DELTA
  );

  return {
    latitude: (bounds.minLat + bounds.maxLat) / 2 - latitudeDelta / 2,
    longitude: (bounds.minLng + bounds.maxLng) / 2 - longitudeDelta / 2,
    latitudeDelta,
    longitudeDelta,
  };
};
