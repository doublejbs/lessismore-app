import PointType from '@/model/point/PointType';

// 히어로 상자 안의 위치 — 폭·높이에 대한 비율(0~1).
export interface HeroRatioPoint {
  x: number;
  y: number;
}

// 히어로 상자 안의 위치(pt).
export interface HeroPixelPoint {
  x: number;
  y: number;
}

export interface HeroExamplePoint {
  type: PointType;
  position: HeroPixelPoint;
}

/**
 * SUB-2 ② 예시 코스 — 왼쪽 아래에서 오른쪽 위로 가는 완만한 S자 3차 베지어 한 개(히어로 폭·높이 비율).
 *
 * 비켜 둘 구역: 아래 1/3(y > 0.667, 순백 페이드 — 선의 가장 낮은 곳이 약 0.62), 좌상단 닫기 ×(출발점이
 * x 0.16에 있고 말풍선이 그 위 36pt라 닫기 원 아래에 남는다), 상단 상태 표시줄(도착 말풍선 윗변이 대표 기기에서
 * 상태 표시줄 아래). 지형과 무관한 일러스트라 고정 비율이다 — 지도 중심이 바뀌어도 같은 자리에 둔다.
 */
const EXAMPLE_CURVE: readonly [
  HeroRatioPoint,
  HeroRatioPoint,
  HeroRatioPoint,
  HeroRatioPoint,
] = [
  { x: 0.16, y: 0.6 },
  { x: 0.48, y: 0.74 },
  { x: 0.52, y: 0.2 },
  { x: 0.84, y: 0.33 },
];

/**
 * 선 위 포인트 마커 세 개 — 곡선 매개변수 t(0 = 출발, 1 = 도착)와 유형. 출발·도착 말풍선과 겹치지 않게
 * 양 끝에서 떨어뜨린다. 유형 순서는 앱 나열 순서(`POINT_TYPES` — 물보급 → 쉼터 → 주의)와 같다.
 */
const EXAMPLE_POINTS: readonly { type: PointType; t: number }[] = [
  { type: PointType.Water, t: 0.27 },
  { type: PointType.Shelter, t: 0.5 },
  { type: PointType.Caution, t: 0.76 },
];

const cubic = (a: number, b: number, c: number, d: number, t: number) => {
  const u = 1 - t;

  return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
};

const toPixel = (
  point: HeroRatioPoint,
  width: number,
  height: number
): HeroPixelPoint => ({ x: point.x * width, y: point.y * height });

// 곡선 위 한 점(pt).
const getCurvePoint = (
  t: number,
  width: number,
  height: number
): HeroPixelPoint => {
  const [p0, p1, p2, p3] = EXAMPLE_CURVE;

  return toPixel(
    {
      x: cubic(p0.x, p1.x, p2.x, p3.x, t),
      y: cubic(p0.y, p1.y, p2.y, p3.y, t),
    },
    width,
    height
  );
};

// SVG `d` 문자열.
export const getExampleRoutePath = (width: number, height: number): string => {
  const [p0, p1, p2, p3] = EXAMPLE_CURVE.map(point =>
    toPixel(point, width, height)
  );

  return `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y} ${p2.x} ${p2.y} ${p3.x} ${p3.y}`;
};

export const getExampleRouteStart = (
  width: number,
  height: number
): HeroPixelPoint => getCurvePoint(0, width, height);

export const getExampleRouteEnd = (
  width: number,
  height: number
): HeroPixelPoint => getCurvePoint(1, width, height);

export const getExampleRoutePoints = (
  width: number,
  height: number
): HeroExamplePoint[] =>
  EXAMPLE_POINTS.map(({ type, t }) => ({
    type,
    position: getCurvePoint(t, width, height),
  }));
