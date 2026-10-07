import { getDistanceInMeters } from '@/model/bag-destination/GeoDistance';
import { RouteCoordinate } from '@/model/route/RouteData';

/**
 * 한 점을 코스 위에 내린 결과 (GRP-8 포인트 → 고도 그래프 표시).
 * 거리 값은 모두 **넘겨받은 좌표 순서**(지금 보는 방향) 기준이다.
 */
export interface RouteProjection {
  // 코스 첫 점부터 가장 가까운 지점까지의 누적 거리(m). 축약 좌표를 따라 잰다.
  distanceAlong: number;
  // 점과 그 지점 사이의 거리(m).
  offset: number;
  // 축약 좌표 전체 길이(m). 원본 거리로 환산할 때 분모가 된다.
  totalDistance: number;
  /**
   * 고도 단면 가로축 기준의 거리(m) — 단면은 고도가 처음 기록된 점을 0으로 민다
   * (`buildRouteElevationProfile`). 고도가 하나도 없는 코스는 `null`이다.
   */
  profileDistance: number | null;
  // 그 지점의 고도(m). 앞뒤 고도 기록을 거리로 선형 보간한다. 고도가 없는 코스는 `null`이다.
  elevation: number | null;
  latitude: number;
  longitude: number;
}

/**
 * 이보다 멀면 코스 위 지점이 아니라고 본다(GRP-8). 코스 옆 샘·대피소는 등산로에서 수백 m
 * 들어가 있기도 해서 너무 좁게 잡으면 정작 물보급 포인트가 빠진다.
 */
export const ROUTE_PROJECTION_MAX_OFFSET_METERS = 500;

const EARTH_RADIUS_METERS = 6371000;

const toRadians = (degrees: number): number => {
  return (degrees * Math.PI) / 180;
};

interface PlanarPoint {
  x: number;
  y: number;
}

/**
 * 가장 가까운 지점을 고르는 데만 쓰는 **국소 평면 근사**(기준점 위도의 등장방형 투영).
 * 500m 판정 범위에서 오차가 무시할 만하고, 누적 거리는 단면과 같은 하버사인으로 따로 잰다.
 */
const toPlanar = (
  coordinate: RouteCoordinate,
  originLat: number,
  originLng: number,
  cosLat: number
): PlanarPoint => {
  return {
    x: toRadians(coordinate.lng - originLng) * cosLat * EARTH_RADIUS_METERS,
    y: toRadians(coordinate.lat - originLat) * EARTH_RADIUS_METERS,
  };
};

const measureSegment = (a: RouteCoordinate, b: RouteCoordinate): number => {
  return getDistanceInMeters(
    { latitude: a.lat, longitude: a.lng },
    { latitude: b.lat, longitude: b.lng }
  );
};

const hasElevation = (coordinate: RouteCoordinate): boolean => {
  return coordinate.ele !== undefined && Number.isFinite(coordinate.ele);
};

/**
 * 누적 거리 `distance`의 고도를 앞뒤 고도 기록으로 선형 보간한다. 선분 양 끝에 고도가 있으면
 * 그 둘의 보간이고, 한쪽이 비었으면 가장 가까운 기록까지 넓혀 본다. 한쪽에만 있으면 그 값이다.
 */
const interpolateElevation = (
  coordinates: readonly RouteCoordinate[],
  cumulative: readonly number[],
  distance: number
): number | null => {
  let before: number | null = null;
  let after: number | null = null;

  for (let index = 0; index < coordinates.length; index++) {
    if (!hasElevation(coordinates[index])) {
      continue;
    }

    if (cumulative[index] <= distance) {
      before = index;
    }

    if (after === null && cumulative[index] >= distance) {
      after = index;
    }
  }

  if (before === null && after === null) {
    return null;
  }

  if (before === null || after === null || before === after) {
    return coordinates[before ?? after ?? 0].ele ?? null;
  }

  const startDistance = cumulative[before];
  const span = cumulative[after] - startDistance;
  const startElevation = coordinates[before].ele ?? 0;
  const endElevation = coordinates[after].ele ?? 0;

  if (span <= 0) {
    return startElevation;
  }

  return (
    startElevation +
    ((distance - startDistance) / span) * (endElevation - startElevation)
  );
};

/**
 * 점(`latitude`·`longitude`)에서 코스 폴리라인에 가장 가까운 지점을 찾는다 (GRP-8).
 *
 * 꼭짓점만 보지 않고 **선분마다 수선을 내린다** — 축약 좌표는 직선 구간의 점을 버리므로 긴
 * 선분 한가운데 옆의 포인트가 양 끝 꼭짓점으로 붙으면 거리가 수 km씩 어긋난다.
 *
 * 좌표는 화면이 그리는 순서(`RouteDisplay.getSimplified()`, 뒤집혔으면 뒤집힌 순서) 그대로
 * 넘긴다 — 누적 거리가 그 방향의 출발점에서 0으로 시작해 고도 그래프·훑기 마커와 맞는다.
 * 좌표가 없으면 `null`이다. 멀리 떨어졌는지(500m)는 호출자가 `offset`으로 가른다.
 */
export const projectPointOntoRoute = (
  coordinates: readonly RouteCoordinate[],
  latitude: number,
  longitude: number
): RouteProjection | null => {
  if (coordinates.length === 0) {
    return null;
  }

  const cosLat = Math.cos(toRadians(latitude));
  const cumulative: number[] = [0];

  for (let index = 1; index < coordinates.length; index++) {
    cumulative.push(
      cumulative[index - 1] +
        measureSegment(coordinates[index - 1], coordinates[index])
    );
  }

  const first = toPlanar(coordinates[0], latitude, longitude, cosLat);
  let bestOffset = Math.hypot(first.x, first.y);
  let bestIndex = 0;
  let bestRatio = 0;

  for (let index = 1; index < coordinates.length; index++) {
    const a = toPlanar(coordinates[index - 1], latitude, longitude, cosLat);
    const b = toPlanar(coordinates[index], latitude, longitude, cosLat);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;
    // 점이 원점이다 — 원점에서 선분 AB에 내린 수선의 발 비율(0~1로 자른다).
    const ratio =
      lengthSquared > 0
        ? Math.min(1, Math.max(0, -(a.x * dx + a.y * dy) / lengthSquared))
        : 0;
    const offset = Math.hypot(a.x + ratio * dx, a.y + ratio * dy);

    if (offset < bestOffset) {
      bestOffset = offset;
      bestIndex = index;
      bestRatio = ratio;
    }
  }

  const start = coordinates[Math.max(0, bestIndex - 1)];
  const end = coordinates[bestIndex];
  const distanceAlong =
    bestIndex === 0
      ? 0
      : cumulative[bestIndex - 1] +
        bestRatio * (cumulative[bestIndex] - cumulative[bestIndex - 1]);
  const originIndex = coordinates.findIndex(hasElevation);

  return {
    distanceAlong,
    offset: bestOffset,
    totalDistance: cumulative[cumulative.length - 1],
    profileDistance:
      originIndex >= 0 ? distanceAlong - cumulative[originIndex] : null,
    elevation: interpolateElevation(coordinates, cumulative, distanceAlong),
    latitude: start.lat + bestRatio * (end.lat - start.lat),
    longitude: start.lng + bestRatio * (end.lng - start.lng),
  };
};
