import { getDistanceInMeters } from '@/model/bag-destination/GeoDistance';
import { HealthWorkoutRoute } from '@/model/health/HealthTypes';
import { RouteCoordinate } from '@/model/route/RouteData';
import RouteReplayMessageType from './RouteReplayMessageType';
import {
  RouteReplayLabels,
  RouteReplayLngLat,
  RouteReplayLoadMessage,
} from './RouteReplayMessage';
import { RouteReplayRequest } from './RouteReplayRequest';

/** 웹뷰로 넘기는 좌표 상한(RR §6) — 코스 축약(GRP-8)과 같은 500점. */
export const ROUTE_REPLAY_MAX_COORDINATES = 500;

/** 리플레이를 그릴 수 있는 최소 좌표 수(RR-3) — 2점 미만은 선이 되지 않는다. */
export const ROUTE_REPLAY_MIN_COORDINATES = 2;

/**
 * 상한을 넘으면 **균등 샘플링**으로 줄인다. 첫 점과 끝 점은 늘 남긴다 — 출발·도착 마커 자리다.
 * 웹뷰 메시지 크기와 선 렌더 비용을 묶는 용도라 모양 보존(Douglas–Peucker)까지는 하지 않는다.
 */
export const sampleRouteCoordinates = (
  coordinates: RouteCoordinate[],
  max: number = ROUTE_REPLAY_MAX_COORDINATES
): RouteCoordinate[] => {
  if (coordinates.length <= max || max < 2) {
    return coordinates;
  }

  const step = (coordinates.length - 1) / (max - 1);

  return Array.from(
    { length: max },
    (_value, index) => coordinates[Math.round(index * step)]
  );
};

/** 좌표를 이은 길이(m, 하버사인). */
export const measureRouteCoordinates = (
  coordinates: RouteCoordinate[]
): number => {
  let total = 0;

  for (let index = 1; index < coordinates.length; index += 1) {
    const previous = coordinates[index - 1];
    const current = coordinates[index];

    total += getDistanceInMeters(
      { latitude: previous.lat, longitude: previous.lng },
      { latitude: current.lat, longitude: current.lng }
    );
  }

  return total;
};

/**
 * 운동 기록의 경로들을 **시간순으로 이어** 한 줄로 만든다(RR-1 — 1박 2일이 날짜별 운동으로 나뉜
 * 기록이 흔하다). 고도는 `altitudeMeters`가 있을 때만 싣는다(`exactOptionalPropertyTypes`).
 *
 * 타임스탬프를 읽을 수 없는 점(`NaN`)은 **원래 순서를 지킨다** — 바로 앞 점의 시각을 물려받아 그 뒤에
 * 붙는다(맨 앞이면 가장 이른 자리). 비교 함수에 `NaN`이 섞이면 정렬 결과가 엔진마다 달라진다.
 */
export const buildActivityReplayCoordinates = (
  routes: HealthWorkoutRoute[]
): RouteCoordinate[] => {
  let lastTime = -Infinity;

  return routes
    .flatMap(route => route.points)
    .map((point, index) => {
      const parsed = new Date(point.timestamp).getTime();

      if (Number.isFinite(parsed)) {
        lastTime = parsed;
      }

      return { point, index, time: lastTime };
    })
    .sort((a, b) => a.time - b.time || a.index - b.index)
    .map(({ point }) =>
      typeof point.altitudeMeters === 'number' &&
      Number.isFinite(point.altitudeMeters)
        ? {
            lat: point.latitude,
            lng: point.longitude,
            ele: point.altitudeMeters,
          }
        : { lat: point.latitude, lng: point.longitude }
    );
};

const toLngLat = (coordinate: RouteCoordinate): RouteReplayLngLat => {
  return typeof coordinate.ele === 'number'
    ? [coordinate.lng, coordinate.lat, coordinate.ele]
    : [coordinate.lng, coordinate.lat];
};

/** 스토어의 진입 데이터를 웹뷰 `load` 메시지로 바꾼다(좌표 500점 축약 포함). */
export const buildRouteReplayLoadMessage = (
  request: RouteReplayRequest,
  labels: RouteReplayLabels
): RouteReplayLoadMessage => {
  return {
    type: RouteReplayMessageType.Load,
    title: request.title,
    coordinates: sampleRouteCoordinates(request.coordinates).map(toLngLat),
    points: request.points.map(point => ({
      lng: point.longitude,
      lat: point.latitude,
      title: point.title,
      type: point.type,
      color: point.color,
    })),
    labels,
  };
};
