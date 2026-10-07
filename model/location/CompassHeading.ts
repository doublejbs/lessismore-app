import { LocationHeadingObject } from 'expo-location';

/** 지도에 반영할 나침반 방향 (BD-11 · GRP-10 방향 모드). */
export interface CompassHeading {
  /**
   * 진북 기준 방위(도, 시계 방향). **0~360으로 접지 않은 연속값**이다 — 359°→1°를 +2°로 이어
   * 카메라 애니메이션이 반대로 한 바퀴 돌지 않게 한다. 마커 각도처럼 접힌 값이 필요하면
   * `normalizeDegrees`를 거친다.
   */
  bearing: number;
  // 기기가 나침반 정확도가 낮다고 알렸는지. 이때 부채꼴을 넓고 옅게 그린다.
  isLowAccuracy: boolean;
}

/**
 * 정확도 단계(`expo-location` `accuracy`: 3 높음 · 2 보통 · 1 낮음 · 0 없음) 중 이 값 이하를
 * "낮다"로 본다. iOS 기준 1은 오차 50° 미만 — 부채꼴이 가리키는 방향을 믿기 어렵다.
 */
const LOW_ACCURACY_LEVEL = 1;

/** 각도를 [0, 360)으로 접는다. */
export const normalizeDegrees = (degrees: number): number => {
  const folded = degrees % 360;

  return folded < 0 ? folded + 360 : folded;
};

/** `from`에서 `to`로 가는 가장 짧은 회전(도, -180~180). */
export const getShortestDelta = (from: number, to: number): number => {
  const delta = normalizeDegrees(to - from);

  return delta > 180 ? delta - 360 : delta;
};

/**
 * 나침반 이벤트에서 방위를 읽는다. 진북(`trueHeading`)을 쓰고, 기기가 진북을 못 주면(-1)
 * 자북(`magHeading`)으로 폴백한다. 둘 다 없으면 `null`.
 */
export const readHeadingDegrees = (
  event: LocationHeadingObject
): number | null => {
  const raw = event.trueHeading >= 0 ? event.trueHeading : event.magHeading;

  if (!Number.isFinite(raw) || raw < 0) {
    return null;
  }

  return normalizeDegrees(raw);
};

export const isLowHeadingAccuracy = (event: LocationHeadingObject): boolean => {
  return event.accuracy <= LOW_ACCURACY_LEVEL;
};
