import { getDistanceInMeters } from '../bag-destination/GeoDistance';
import { HealthRoutePoint, HealthSeriesPoint } from './HealthTypes';

// GPS 경로에서 페이스(분/km) 시계열을 파생한다(HA-4 그래프).
//
// 건강 허브는 페이스를 별도 샘플로 주지 않는다 — 운동 전체의 평균 페이스는 거리·시간으로
// 구할 수 있지만 "시간축 추이"는 경로 좌표에서 만들어야 한다. 좌표 두 점의 순간 페이스는
// GPS 잡음(수 m 튐)에 그대로 노출돼 그래프가 못 쓰게 되므로 일정 시간 창으로 묶어 평균을 낸다.

const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const METERS_PER_KILOMETER = 1000;

/** 평균을 낼 창 길이(초). 짧으면 잡음이, 길면 오르막·내리막 변화가 뭉개진다. */
const PACE_WINDOW_SECONDS = 60;

/** 창 안 이동이 이보다 짧으면 사실상 멈춘 구간이라 페이스가 무한대로 튄다. */
const MIN_WINDOW_DISTANCE_METERS = 10;

/** 이보다 느린 값은 휴식으로 보고 버린다 — 남기면 y축 스케일만 망가진다. */
const MAX_PACE_MINUTES_PER_KILOMETER = 60;

/** 창을 하나도 만들 수 없는 경로. */
const MIN_ROUTE_POINTS = 2;

/**
 * 구간 거리·시간 → 페이스(분/km). 정지·이상치 구간은 null로 걸러 낸다.
 */
const getPaceMinutesPerKilometer = (
  distanceMeters: number,
  elapsedSeconds: number
): number | null => {
  if (distanceMeters < MIN_WINDOW_DISTANCE_METERS || elapsedSeconds <= 0) {
    return null;
  }

  const pace =
    elapsedSeconds /
    SECONDS_PER_MINUTE /
    (distanceMeters / METERS_PER_KILOMETER);

  if (pace > MAX_PACE_MINUTES_PER_KILOMETER) {
    return null;
  }

  return pace;
};

/**
 * 경로 좌표열 → 페이스 시계열. 데이터가 부족하거나 전 구간이 정지면 빈 배열이고,
 * 그 경우 호출부는 페이스 그래프를 생략한다(HA-4).
 */
export const derivePaceSeries = (
  points: HealthRoutePoint[]
): HealthSeriesPoint[] => {
  if (points.length < MIN_ROUTE_POINTS) {
    return [];
  }

  const series: HealthSeriesPoint[] = [];
  let windowStart = points[0];
  let windowDistanceMeters = 0;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];

    windowDistanceMeters += getDistanceInMeters(previous, current);

    const elapsedSeconds =
      (current.timestamp.getTime() - windowStart.timestamp.getTime()) /
      MILLISECONDS_PER_SECOND;

    if (elapsedSeconds < PACE_WINDOW_SECONDS) {
      continue;
    }

    const pace = getPaceMinutesPerKilometer(
      windowDistanceMeters,
      elapsedSeconds
    );

    if (pace !== null) {
      series.push({ timestamp: current.timestamp, value: pace });
    }

    // 창을 버렸더라도(정지 구간) 시작점은 옮긴다 — 그래야 다음 창이 휴식 시간을 물고 가지 않는다.
    windowStart = current;
    windowDistanceMeters = 0;
  }

  return series;
};
