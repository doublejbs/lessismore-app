import { RouteBounds, RouteCoordinate } from '@/model/route/RouteData';

// 위도 1°의 길이(m)와 적도에서 경도 1°의 길이(m). 코스 한 벌(수십 km) 범위에서는 평면 근사로 충분하다.
const METERS_PER_LAT_DEGREE = 110540;
const METERS_PER_LNG_DEGREE_AT_EQUATOR = 111320;
// 내용이 없을 때의 기준점(남한 중앙 — 지도 폴백 카메라와 같은 자리).
const FALLBACK_ORIGIN = { lat: 36.2, lng: 127.9 };
// 한 점뿐인 내용(포인트 하나 등)도 맞출 수 있게 잡는 최소 폭(m).
const MIN_FIT_SPAN_METERS = 400;
// 축척 막대 후보(m). 화면 폭에 맞는 가장 긴 값을 고른다.
const SCALE_STEPS = [
  5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000,
];
const SCALE_BAR_MAX_PX = 96;
const METERS_PER_KILOMETER = 1000;

// 캔버스 평면 좌표(m). x는 동쪽, y는 남쪽(화면 아래)이 양수다.
export interface CanvasPoint {
  x: number;
  y: number;
}

/**
 * 캔버스 카메라 (OF-6). 지도 카메라와 같은 뜻을 평면에 옮긴 것이다 — 화면 정중앙이 `center`를 보고,
 * `scale`(px/m)로 확대하고, `rotation`(도, 시계 방향)만큼 평면을 돌린다(방향 모드 — 바라보는 방향이 위).
 */
export interface CanvasCamera {
  center: CanvasPoint;
  scale: number;
  rotation: number;
}

export interface CanvasSize {
  width: number;
  height: number;
}

export interface ScaleBar {
  pixels: number;
  label: string;
}

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/**
 * 오프라인 코스 캔버스의 투영 (OF-6). 지도 타일 없이 코스·포인트·내 위치를 같은 평면에 놓는다.
 *
 * 기준점을 중심으로 한 등거리 원통 근사(경도 간격에 cos(위도)를 곱한다)라 평면 단위가 곧 미터다 —
 * 축척 막대를 계산 없이 그릴 수 있다. 등고선·지명은 없다(가짜 지형은 산에서 위험하다 — OF-6).
 */
class OfflineCanvasProjection {
  // 상자를 비교용 문자열로(소수 5자리 ≈ 1m). 내용이 같으면 같은 기준점을 다시 쓴다.
  public static toKey(bounds: RouteBounds | null): string {
    if (!bounds) {
      return '';
    }

    return [bounds.minLat, bounds.maxLat, bounds.minLng, bounds.maxLng]
      .map(value => value.toFixed(5))
      .join(',');
  }

  public static fromKey(key: string) {
    const values = key.split(',').map(Number);

    if (values.length !== 4 || values.some(value => !Number.isFinite(value))) {
      return OfflineCanvasProjection.from(null);
    }

    const [minLat, maxLat, minLng, maxLng] = values;

    return OfflineCanvasProjection.from({ minLat, maxLat, minLng, maxLng });
  }

  public static from(bounds: RouteBounds | null) {
    const origin = bounds
      ? {
          lat: (bounds.minLat + bounds.maxLat) / 2,
          lng: (bounds.minLng + bounds.maxLng) / 2,
        }
      : FALLBACK_ORIGIN;

    return new OfflineCanvasProjection(origin.lat, origin.lng);
  }

  private readonly metersPerLngDegree: number;

  private constructor(
    private readonly originLat: number,
    private readonly originLng: number
  ) {
    this.metersPerLngDegree =
      METERS_PER_LNG_DEGREE_AT_EQUATOR * Math.cos(toRadians(originLat));
  }

  public project(latitude: number, longitude: number): CanvasPoint {
    return {
      x: (longitude - this.originLng) * this.metersPerLngDegree,
      y: -(latitude - this.originLat) * METERS_PER_LAT_DEGREE,
    };
  }

  public projectCoordinate(coordinate: RouteCoordinate): CanvasPoint {
    return this.project(coordinate.lat, coordinate.lng);
  }

  // 코스 한 벌을 SVG 경로로(평면 좌표 그대로 — 화면 변환은 그룹 transform이 한다).
  public toPath(coordinates: readonly RouteCoordinate[]): string {
    return coordinates
      .map((coordinate, index) => {
        const point = this.projectCoordinate(coordinate);

        return `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
      })
      .join(' ');
  }

  // 상자 전체가 화면(여백 제외)에 들어오는 카메라. 회전은 0(북쪽 위)이다.
  public fit(
    bounds: RouteBounds,
    size: CanvasSize,
    padding: number
  ): CanvasCamera {
    const topLeft = this.project(bounds.maxLat, bounds.minLng);
    const bottomRight = this.project(bounds.minLat, bounds.maxLng);
    const spanX = Math.max(bottomRight.x - topLeft.x, MIN_FIT_SPAN_METERS);
    const spanY = Math.max(bottomRight.y - topLeft.y, MIN_FIT_SPAN_METERS);
    const usableWidth = Math.max(size.width - padding * 2, 1);
    const usableHeight = Math.max(size.height - padding * 2, 1);

    return {
      center: {
        x: (topLeft.x + bottomRight.x) / 2,
        y: (topLeft.y + bottomRight.y) / 2,
      },
      scale: Math.min(usableWidth / spanX, usableHeight / spanY),
      rotation: 0,
    };
  }
}

// 평면 → 화면(px).
export const toScreen = (
  point: CanvasPoint,
  camera: CanvasCamera,
  size: CanvasSize
): CanvasPoint => {
  const radians = toRadians(camera.rotation);
  const dx = (point.x - camera.center.x) * camera.scale;
  const dy = (point.y - camera.center.y) * camera.scale;

  return {
    x: size.width / 2 + dx * Math.cos(radians) - dy * Math.sin(radians),
    y: size.height / 2 + dx * Math.sin(radians) + dy * Math.cos(radians),
  };
};

// 화면(px) → 평면. 핀치 초점 고정·드래그 이동에 쓴다.
export const fromScreen = (
  screen: CanvasPoint,
  camera: CanvasCamera,
  size: CanvasSize
): CanvasPoint => {
  const radians = toRadians(-camera.rotation);
  const dx = screen.x - size.width / 2;
  const dy = screen.y - size.height / 2;

  return {
    x:
      camera.center.x +
      (dx * Math.cos(radians) - dy * Math.sin(radians)) / camera.scale,
    y:
      camera.center.y +
      (dx * Math.sin(radians) + dy * Math.cos(radians)) / camera.scale,
  };
};

// SVG 그룹 transform(`matrix(a b c d e f)`) — 평면 좌표의 경로를 화면에 그대로 옮긴다.
export const toSvgMatrix = (camera: CanvasCamera, size: CanvasSize): string => {
  const radians = toRadians(camera.rotation);
  const a = camera.scale * Math.cos(radians);
  const b = camera.scale * Math.sin(radians);
  const c = -camera.scale * Math.sin(radians);
  const d = camera.scale * Math.cos(radians);
  const e = size.width / 2 - (a * camera.center.x + c * camera.center.y);
  const f = size.height / 2 - (b * camera.center.x + d * camera.center.y);

  return `matrix(${a} ${b} ${c} ${d} ${e} ${f})`;
};

// 축척 막대(OF-6 좌하단). 최대 길이 안에서 가장 긴 반올림 값을 고른다.
export const getScaleBar = (scale: number): ScaleBar => {
  const maxMeters = SCALE_BAR_MAX_PX / scale;
  const meters =
    [...SCALE_STEPS].reverse().find(step => step <= maxMeters) ??
    SCALE_STEPS[0];

  return {
    pixels: meters * scale,
    label:
      meters >= METERS_PER_KILOMETER
        ? `${meters / METERS_PER_KILOMETER} km`
        : `${meters} m`,
  };
};

export default OfflineCanvasProjection;
