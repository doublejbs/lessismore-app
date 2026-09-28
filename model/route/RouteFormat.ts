const METERS_IN_KILOMETER = 1000;

/**
 * 코스 거리 표기 (GRP-8, BD-11). 1km 이상은 km 소수 첫째 자리, 미만은 m 정수다.
 * 단위는 숫자에 붙는 라틴 기호라 다국어 키로 빼지 않는다.
 *
 * `scale`은 **어느 단위로 읽을지**를 정하는 기준값이다. 고도 그래프의 가로축처럼 한 줄에
 * 여러 값을 나란히 적는 자리에서, 시작(0m)과 끝(12.3km)의 단위가 갈리면 두 값을 비교할 수
 * 없다 — 그럴 때 끝값을 기준으로 넘겨 `0.0km ~ 12.3km`로 맞춘다.
 */
export const formatRouteDistance = (
  meters: number,
  scale: number = meters
): string => {
  if (scale >= METERS_IN_KILOMETER) {
    return `${(meters / METERS_IN_KILOMETER).toFixed(1)}km`;
  }

  return `${Math.round(meters)}m`;
};

// 해발 고도 표기(m 정수). 거리와 같은 이유로 단위는 그대로 둔다.
export const formatRouteAltitude = (meters: number): string => {
  return `${Math.round(meters)}m`;
};
