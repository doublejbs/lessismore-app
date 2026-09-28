import { getDistanceInMeters } from '@/model/bag-destination/GeoDistance';
import { RouteCoordinate } from '@/model/route/RouteData';

// 고도 단면의 한 표본. 그래프의 한 점이자, 지도 마커가 설 좌표다(GRP-8).
export interface RouteElevationSample {
  // 단면 시작점부터의 누적 거리(m).
  distance: number;
  // 해발 고도(m).
  elevation: number;
  latitude: number;
  longitude: number;
}

export interface RouteElevationProfile {
  samples: RouteElevationSample[];
  // 단면 전체 길이(m). 마지막 표본의 누적 거리다.
  totalDistance: number;
  minElevation: number;
  maxElevation: number;
  // 최고점 표본의 인덱스. 축에 최고점만 적기 위한 값이다(GRP-8).
  peakIndex: number;
}

// 선이 되려면 최소 두 점이 필요하다. 한 점짜리 단면은 그리지 않는다.
const MIN_SAMPLE_COUNT = 2;

/**
 * 고도 상승 히스테리시스(m). GPS 고도는 제자리에서도 ±1~2m 흔들려, 차이를 그대로 더하면
 * 평지 코스도 수백 m를 오른 것으로 나온다. 이 폭을 넘게 올라간 구간만 상승으로 센다.
 */
const ELEVATION_NOISE_THRESHOLD_METERS = 3;

/**
 * 고도 상승 합(m) — 3m 히스테리시스 (GRP-8, BD-11).
 *
 * 파서(원본 트랙포인트 전부)와 기존 코스 폴백(축약 좌표 `ele`)이 **같은 함수**를 쓴다 —
 * 두 곳에서 따로 세면 같은 코스의 상승이 화면에 따라 달라진다.
 * 고도가 없는 점(`null`·`undefined`)은 건너뛴다. 고도가 하나도 없으면 `null`이고,
 * 그때는 "0m 상승"이 아니라 고도 칸 자체를 감춘다.
 */
export const measureElevationGain = (
  elevations: readonly (number | null | undefined)[]
): number | null => {
  let gain = 0;
  let measured = false;
  let reference: number | null = null;

  for (const elevation of elevations) {
    if (
      elevation === null ||
      elevation === undefined ||
      !Number.isFinite(elevation)
    ) {
      continue;
    }

    measured = true;

    if (reference === null) {
      reference = elevation;

      continue;
    }

    const delta = elevation - reference;

    if (delta >= ELEVATION_NOISE_THRESHOLD_METERS) {
      gain += delta;
      reference = elevation;

      continue;
    }

    // 내려간 구간은 새 바닥이 된다 — 다음 상승은 이 지점부터 잰다.
    if (delta < 0) {
      reference = elevation;
    }
  }

  return measured ? gain : null;
};

/**
 * 고도 하강 합(m) (GRP-8 코스 뒤집기, DM-29·DM-30 `elevationLoss`).
 *
 * **역순으로 잰 상승**으로 정의한다 — 상승과 같은 3m 히스테리시스를 그대로 쓰고, 뒤집어 볼 때의
 * 상승이 이 값과 **정확히** 같아진다. 순방향으로 "내려간 폭"을 따로 세는 식은 히스테리시스가
 * 시간 대칭이 아니라서 뒤집은 상승과 몇 m씩 어긋날 수 있다.
 */
export const measureElevationLoss = (
  elevations: readonly (number | null | undefined)[]
): number | null => {
  return measureElevationGain([...elevations].reverse());
};

/**
 * 축약 좌표에서 고도 단면을 만든다 (GRP-8).
 *
 * 누적 거리는 **고도가 없는 점까지 포함해** 폴리라인을 따라 잰다 — 고도가 군데군데 빠진
 * 파일에서 그 구간을 빼고 재면 단면이 실제보다 짧아져 지도 위 위치와 어긋난다.
 * 고도가 하나도 없거나 한 점뿐이면 `null`이고, 그때 화면은 그래프 자리를 아예 비운다.
 *
 * 한 번 만들면 값이 바뀌지 않는다 — 훑는 동안 다시 만들지 않도록 호출자가 코스 단위로 잡아 둔다.
 */
export const buildRouteElevationProfile = (
  coordinates: readonly RouteCoordinate[]
): RouteElevationProfile | null => {
  const samples: RouteElevationSample[] = [];
  let distance = 0;
  let minElevation = Number.POSITIVE_INFINITY;
  let maxElevation = Number.NEGATIVE_INFINITY;
  let peakIndex = 0;

  coordinates.forEach((coordinate, index) => {
    if (index > 0) {
      const previous = coordinates[index - 1];

      distance += getDistanceInMeters(
        { latitude: previous.lat, longitude: previous.lng },
        { latitude: coordinate.lat, longitude: coordinate.lng }
      );
    }

    if (coordinate.ele === undefined || !Number.isFinite(coordinate.ele)) {
      return;
    }

    if (coordinate.ele > maxElevation) {
      maxElevation = coordinate.ele;
      peakIndex = samples.length;
    }

    minElevation = Math.min(minElevation, coordinate.ele);
    samples.push({
      distance,
      elevation: coordinate.ele,
      latitude: coordinate.lat,
      longitude: coordinate.lng,
    });
  });

  if (samples.length < MIN_SAMPLE_COUNT) {
    return null;
  }

  // 고도가 코스 중간부터 기록된 파일은 첫 표본이 0m가 아니다 — 가로축을 0에서 시작하도록 민다.
  const origin = samples[0].distance;
  const shifted = samples.map(sample => ({
    ...sample,
    distance: sample.distance - origin,
  }));

  return {
    samples: shifted,
    totalDistance: shifted[shifted.length - 1].distance,
    minElevation,
    maxElevation,
    peakIndex,
  };
};

/**
 * 가로 위치(0~1)에 해당하는 표본을 고른다 (GRP-8 훑기).
 *
 * 거리 기준 이분 탐색이다 — 표본 간격이 균등하지 않아(축약이 직선 구간의 점을 버린다)
 * 인덱스를 비율로 잡으면 손가락 위치와 지도 마커가 어긋난다.
 */
export const findRouteElevationSample = (
  profile: RouteElevationProfile,
  ratio: number
): RouteElevationSample => {
  const { samples, totalDistance } = profile;
  const clamped = Math.min(1, Math.max(0, ratio));

  if (totalDistance <= 0) {
    return samples[Math.round(clamped * (samples.length - 1))];
  }

  const target = clamped * totalDistance;
  let low = 0;
  let high = samples.length - 1;

  while (low < high) {
    const middle = Math.floor((low + high) / 2);

    if (samples[middle].distance < target) {
      low = middle + 1;

      continue;
    }

    high = middle;
  }

  if (low > 0) {
    const previous = samples[low - 1];

    // 두 표본 사이에 떨어졌으면 가까운 쪽을 고른다 — 손가락 아래 값이 한 칸씩 밀리지 않게.
    if (target - previous.distance < samples[low].distance - target) {
      return previous;
    }
  }

  return samples[low];
};
