import { getDistanceInMeters } from '@/model/bag-destination/GeoDistance';
import { GROUP_ROUTE_MAX_SIMPLIFIED_POINTS } from '@/model/group/GroupLimits';
import { RouteDrawPoint } from './RouteDrawPoint';

// 선분을 나누는 기본 간격(m) — 고도 그래프가 지형을 읽을 만큼 촘촘하고, 저장 상한(500점)에 쉽게 닿지 않는 값(RD-3).
export const ROUTE_DRAW_SAMPLE_INTERVAL_METERS = 100;
// 샘플이 상한을 넘을 때 간격을 늘리는 배율.
const INTERVAL_GROWTH = 1.25;
// 간격을 늘리는 최대 횟수 — 1.25^64면 지구 둘레를 넘어 반드시 찍은 점 수(≤100)로 수렴한다.
const MAX_GROWTH_STEPS = 64;

// 선분 하나를 몇 조각으로 나눌지 — 짧아도 1조각(끝점은 남긴다).
const getSegmentParts = (length: number, interval: number): number =>
  Math.max(1, Math.ceil(length / interval));

const countSamples = (lengths: readonly number[], interval: number): number =>
  lengths.reduce((sum, length) => sum + getSegmentParts(length, interval), 1);

/**
 * 찍은 점들을 잇는 직선을 샘플 좌표로 나눈다 (RD-3 1번).
 *
 * - 각 선분을 약 100m 간격으로 나눈다(끝점 포함). 찍은 점은 **모두** 샘플에 남는다 — 선분 경계가 곧 찍은 점이다.
 * - 전체가 500점(DM-29·DM-30 `simplified` 상한)을 넘으면 간격을 늘려 500점 이하로 맞춘다.
 * - 보간은 위경도 선형이다 — 100m 남짓한 조각에서는 대권 보간과 차이가 없다.
 */
export const sampleRouteDrawLine = (
  points: readonly RouteDrawPoint[]
): RouteDrawPoint[] => {
  if (points.length < 2) {
    return points.map(point => ({ ...point }));
  }

  const lengths = points
    .slice(1)
    .map((point, index) => getDistanceInMeters(points[index], point));
  let interval = ROUTE_DRAW_SAMPLE_INTERVAL_METERS;
  let step = 0;

  while (
    countSamples(lengths, interval) > GROUP_ROUTE_MAX_SIMPLIFIED_POINTS &&
    step < MAX_GROWTH_STEPS
  ) {
    interval *= INTERVAL_GROWTH;
    step += 1;
  }

  const samples: RouteDrawPoint[] = [{ ...points[0] }];

  lengths.forEach((length, index) => {
    const from = points[index];
    const to = points[index + 1];
    const parts = getSegmentParts(length, interval);

    for (let part = 1; part <= parts; part += 1) {
      const ratio = part / parts;

      samples.push(
        part === parts
          ? { ...to }
          : {
              latitude: from.latitude + (to.latitude - from.latitude) * ratio,
              longitude:
                from.longitude + (to.longitude - from.longitude) * ratio,
            }
      );
    }
  });

  return samples;
};
