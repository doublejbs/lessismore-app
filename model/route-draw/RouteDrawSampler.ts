import { getDistanceInMeters } from '@/model/bag-destination/GeoDistance';
import { GROUP_ROUTE_MAX_SIMPLIFIED_POINTS } from '@/model/group/GroupLimits';
import { RouteCoordinate } from '@/model/route/RouteData';

// 선분을 나누는 기본 간격(m) — 고도 그래프가 지형을 읽을 만큼 촘촘하고, 저장 상한(500점)에 쉽게 닿지 않는 값(RD-3).
export const ROUTE_DRAW_SAMPLE_INTERVAL_METERS = 100;
// 샘플이 상한을 넘을 때 간격을 늘리는 배율.
const INTERVAL_GROWTH = 1.25;
// 간격을 늘리는 최대 횟수 — 1.25^64면 지구 둘레를 넘어 반드시 구간 수 + 1(≤100)로 수렴한다.
const MAX_GROWTH_STEPS = 64;

const measureEdge = (from: RouteCoordinate, to: RouteCoordinate): number =>
  getDistanceInMeters(
    { latitude: from.lat, longitude: from.lng },
    { latitude: to.lat, longitude: to.lng }
  );

const copyCoordinate = (coordinate: RouteCoordinate): RouteCoordinate => ({
  lat: coordinate.lat,
  lng: coordinate.lng,
  ...(coordinate.ele !== undefined ? { ele: coordinate.ele } : {}),
});

// 위경도 선형 보간 — 100m 남짓한 조각에서는 대권 보간과 차이가 없다. 고도는 두 끝에 다 있을 때만 잇는다.
const interpolateCoordinate = (
  from: RouteCoordinate,
  to: RouteCoordinate,
  ratio: number
): RouteCoordinate => ({
  lat: from.lat + (to.lat - from.lat) * ratio,
  lng: from.lng + (to.lng - from.lng) * ratio,
  ...(from.ele !== undefined && to.ele !== undefined
    ? { ele: from.ele + (to.ele - from.ele) * ratio }
    : {}),
});

/**
 * 구간 하나를 `interval` 간격으로 샘플링해 `samples` 뒤에 붙인다. 첫 좌표는 넣지 않는다(앞 구간 끝 = 찍은 점이
 * 이미 들어 있다). **끝 좌표(찍은 점)는 반드시 넣는다.**
 *
 * - 간격보다 긴 변(직선 구간이 그렇다)은 간격대로 나눈다 — 직선 두 점이면 예전 선분 보간과 같은 결과다.
 * - 간격보다 짧은 변이 이어지는 촘촘한 길 좌표는 간격만큼 걸을 때마다 **원래 좌표를 골라** 남긴다(서버 `ele` 그대로).
 */
const sampleSegment = (
  coordinates: readonly RouteCoordinate[],
  lengths: readonly number[],
  interval: number,
  samples: RouteCoordinate[]
) => {
  const lastIndex = coordinates.length - 1;
  let walked = 0;

  for (let index = 1; index <= lastIndex; index += 1) {
    const from = coordinates[index - 1];
    const to = coordinates[index];
    const length = lengths[index - 1];

    if (length > interval) {
      // 긴 변 앞의 꺾인 자리를 남겨 모양이 깎이지 않게 한다.
      if (walked > 0) {
        samples.push(copyCoordinate(from));
      }

      const parts = Math.ceil(length / interval);

      for (let part = 1; part < parts; part += 1) {
        samples.push(interpolateCoordinate(from, to, part / parts));
      }

      samples.push(copyCoordinate(to));
      walked = 0;

      continue;
    }

    walked += length;

    if (walked >= interval || index === lastIndex) {
      samples.push(copyCoordinate(to));
      walked = 0;
    }
  }
};

const samplePath = (
  segments: readonly (readonly RouteCoordinate[])[],
  lengths: readonly (readonly number[])[],
  interval: number,
  verbatim: readonly boolean[]
): RouteCoordinate[] => {
  const samples: RouteCoordinate[] = [copyCoordinate(segments[0][0])];

  segments.forEach((coordinates, index) => {
    const last = samples[samples.length - 1];
    const first = coordinates[0];

    // 구간 경계(찍은 점)는 한 번만 넣는다 — 앞 구간 끝에 고도가 없고 이 구간 첫 좌표(길 좌표)에 있으면 그 값을 쓴다.
    if (last.ele === undefined && first.ele !== undefined) {
      samples[samples.length - 1] = { ...last, ele: first.ele };
    }

    // 이미 저장 샘플인 구간(수정 모드에서 되살린 구간 — RD-7)은 다시 고르지 않고 그대로 잇는다.
    if (verbatim[index]) {
      coordinates.slice(1).forEach(coordinate => {
        samples.push(copyCoordinate(coordinate));
      });

      return;
    }

    sampleSegment(coordinates, lengths[index], interval, samples);
  });

  return samples;
};

/**
 * 구간 좌표 전체를 이은 경로를 저장용 샘플 좌표로 만든다 (RD-3 1번 · RD-6).
 *
 * - 직선 구간은 약 100m 간격으로 나누고(끝점 포함), 길 따라 구간은 이미 촘촘하므로 간격마다 원래 좌표를 고른다.
 * - 찍은 점(구간 경계)은 **모두** 샘플에 남는다.
 * - 전체가 500점(DM-29·DM-30 `simplified` 상한)을 넘으면 간격을 늘려 500점 이하로 맞춘다.
 * - 길 좌표의 `ele`는 그대로 옮긴다. 고도가 없는 샘플(직선 구간)은 부르는 쪽이 지형 타일로 채운다.
 * - `verbatim[i]`가 참인 구간은 **이미 저장 샘플**이다(수정 모드에서 되살린 구간 — RD-7). 다시 고르면 저장할 때마다
 *   선이 성겨지므로 좌표를 그대로 잇는다. 그래도 500점을 넘으면 모든 구간을 다시 고른다(상한이 먼저다).
 */
export const sampleRouteDrawPath = (
  segments: readonly (readonly RouteCoordinate[])[],
  verbatim: readonly boolean[] = []
): RouteCoordinate[] => {
  const usableIndexes = segments
    .map((coordinates, index) => (coordinates.length >= 2 ? index : -1))
    .filter(index => index >= 0);
  const usable = usableIndexes.map(index => segments[index]);
  const usableVerbatim = usableIndexes.map(index => !!verbatim[index]);

  if (usable.length === 0) {
    return segments.length > 0 && segments[0].length > 0
      ? [copyCoordinate(segments[0][0])]
      : [];
  }

  const lengths = usable.map(coordinates =>
    coordinates
      .slice(1)
      .map((coordinate, index) => measureEdge(coordinates[index], coordinate))
  );
  const total = lengths.reduce(
    (sum, edges) => edges.reduce((edgeSum, edge) => edgeSum + edge, sum),
    0
  );
  // 길이가 길면 상한 근처 간격에서 시작한다 — 촘촘한 길 좌표(구간당 최대 2,000점)를 여러 번 다시 걷지 않게.
  let interval = Math.max(
    ROUTE_DRAW_SAMPLE_INTERVAL_METERS,
    total / GROUP_ROUTE_MAX_SIMPLIFIED_POINTS
  );
  let samples: RouteCoordinate[] = [];

  if (usableVerbatim.some(Boolean)) {
    samples = samplePath(usable, lengths, interval, usableVerbatim);

    if (samples.length <= GROUP_ROUTE_MAX_SIMPLIFIED_POINTS) {
      return samples;
    }
  }

  const none = usable.map(() => false);

  samples = samplePath(usable, lengths, interval, none);
  let step = 0;

  while (
    samples.length > GROUP_ROUTE_MAX_SIMPLIFIED_POINTS &&
    step < MAX_GROWTH_STEPS
  ) {
    interval *= INTERVAL_GROWTH;
    step += 1;
    samples = samplePath(usable, lengths, interval, none);
  }

  return samples;
};
