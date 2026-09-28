import { getDistanceInMeters } from '@/model/bag-destination/GeoDistance';
import { RouteBounds, RouteCoordinate } from '@/model/route/RouteData';
import {
  GROUP_MAX_LATITUDE,
  GROUP_MAX_LONGITUDE,
  GROUP_ROUTE_MAX_SIMPLIFIED_POINTS,
  GROUP_ROUTE_MIN_SIMPLIFIED_POINTS,
} from '@/model/group/GroupLimits';
import {
  measureElevationGain,
  measureElevationLoss,
} from '@/model/route/RouteElevation';
import RouteValidator from './RouteValidator';
import GpxParseError from '@/model/route/GpxParseError';
import GpxParseErrorType from '@/model/route/GpxParseErrorType';

// 파싱이 끝난 GPX 한 벌 (GRP-8). 그대로 `RouteDraft`를 채우는 데 쓴다.
export interface GpxParseResult {
  // `<trk><name>` → `<rte><name>` → `<metadata><name>` 순으로 찾은 값. 없으면 빈 문자열이고,
  // 그때는 호출자가 파일명을 쓴다.
  name: string;
  // 지도 렌더용 축약 좌표(500점 이하).
  simplified: RouteCoordinate[];
  // 총 거리(m). 원본 트랙포인트 전부를 이어 잰 값이다.
  distance: number;
  // 고도 상승(m). 상승분만 더한다. 고도가 하나도 기록되지 않은 파일은 `null`이고,
  // 그때는 "0m 상승"이 아니라 고도 칸 자체를 감춘다.
  elevationGain: number | null;
  // 고도 하강(m). 상승과 같은 3m 히스테리시스로 잰다 — 코스를 뒤집어 볼 때의 상승이 이 값이다.
  // 고도가 없으면 `null`이다(GRP-8, DM-29·DM-30 `elevationLoss`).
  elevationLoss: number | null;
  // 원본 트랙포인트 수.
  pointCount: number;
  bounds: RouteBounds;
}

interface GpxTrackPoint {
  latitude: number;
  longitude: number;
  elevation: number | null;
}

interface PlanarPoint {
  x: number;
  y: number;
}

const COMMENT_PATTERN = /<!--[\s\S]*?-->/g;
const CDATA_PATTERN = /<!\[CDATA\[([\s\S]*?)\]\]>/g;
const GPX_ROOT_PATTERN = /<(?:[\w.-]+:)?gpx[\s>]/i;
const LATITUDE_PATTERN = /\blat\s*=\s*["']([^"']*)["']/i;
const LONGITUDE_PATTERN = /\blon\s*=\s*["']([^"']*)["']/i;
const ELEVATION_PATTERN = /<(?:[\w.-]+:)?ele\b[^>]*>([^<]*)<\//i;
const NUMERIC_ENTITY_PATTERN = /&#(\d+);/g;
const HEX_ENTITY_PATTERN = /&#x([0-9a-f]+);/gi;
const NAMED_ENTITY_PATTERN = /&(amp|lt|gt|quot|apos);/gi;

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

// 위도 1도의 거리. 축약의 평면 근사에만 쓰므로 상수 하나면 충분하다.
const METERS_PER_LATITUDE_DEGREE = 111320;

// 축약 허용 오차(m)의 시작값과 배증 횟수. 2^24 m면 지구 둘레를 넘어 반드시 수렴한다.
const INITIAL_TOLERANCE_METERS = 1;
const MAX_TOLERANCE_STEPS = 24;

const toRadians = (degrees: number): number => {
  return (degrees * Math.PI) / 180;
};

const decodeXmlText = (value: string): string => {
  return value
    .replace(CDATA_PATTERN, '$1')
    .replace(HEX_ENTITY_PATTERN, (match, hex: string) => {
      const code = Number.parseInt(hex, 16);

      return Number.isFinite(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : match;
    })
    .replace(NUMERIC_ENTITY_PATTERN, (match, decimal: string) => {
      const code = Number.parseInt(decimal, 10);

      return Number.isFinite(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : match;
    })
    .replace(NAMED_ENTITY_PATTERN, (match, name: string) => {
      return NAMED_ENTITIES[name.toLowerCase()] ?? match;
    });
};

const createElementPattern = (tag: string): RegExp => {
  // 네임스페이스 접두사(`gpx:trkpt`)를 허용하고, 자기닫힘 태그와 여는/닫는 쌍을 함께 받는다.
  return new RegExp(
    `<(?:[\\w.-]+:)?${tag}\\b([^>]*?)(?:/>|>([\\s\\S]*?)</(?:[\\w.-]+:)?${tag}\\s*>)`,
    'gi'
  );
};

const toCoordinate = (value: string | undefined): number | null => {
  if (value === undefined) {
    return null;
  }

  const parsed = Number.parseFloat(value.trim());

  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * GPX(XML)를 직접 읽는다 (GRP-8).
 *
 * XML 파서를 새로 들이지 않는다 — 이 화면이 GPX에서 보는 것은 `<trkpt lat lon>`과 그 안의
 * `<ele>`, 그리고 트랙 이름뿐이라 정규식 스캔으로 충분하고, 5MB 문서에 DOM을 세우는 비용도
 * 치르지 않는다.
 */
class GpxParser {
  /**
   * 파싱 전에 거른다 — 5MB를 읽어 들이고 나서 거절하면 그만큼이 헛일이다.
   *
   * 판정은 `RouteValidator`와 공유하고(같은 상한을 두 곳에 두지 않는다) 에러만 이 단계의 것을 던진다.
   * 크기를 재지 못한 파일(선택기가 크기를 주지 않는 `content://` 등)은 **크기 미상**이라
   * `Invalid`로 보낸다 — 작은 파일에 "5MB까지 올릴 수 있어요"라고 하면 사용자가 할 수 있는 일이 없다.
   */
  public static validateFileSize(fileSize: number) {
    if (!RouteValidator.isKnownRouteFileSize(fileSize)) {
      throw new GpxParseError(GpxParseErrorType.Invalid);
    }

    if (!RouteValidator.isValidRouteFileSize(fileSize)) {
      throw new GpxParseError(GpxParseErrorType.TooLarge);
    }
  }

  public static parse(text: string): GpxParseResult {
    const xml = text.replace(COMMENT_PATTERN, '');

    if (!GPX_ROOT_PATTERN.test(xml)) {
      throw new GpxParseError(GpxParseErrorType.Invalid);
    }

    // 트랙이 우선이다. `<rte>`만 있는 계획 경로 파일도 그릴 수 있으므로 폴백으로 받는다.
    const trackPoints = GpxParser.readPoints(xml, 'trkpt');
    const points = trackPoints.length
      ? trackPoints
      : GpxParser.readPoints(xml, 'rtept');

    if (points.length < GROUP_ROUTE_MIN_SIMPLIFIED_POINTS) {
      throw new GpxParseError(GpxParseErrorType.NoTrack);
    }

    const elevations = points.map(point => point.elevation);

    return {
      name: GpxParser.readName(xml),
      simplified: GpxParser.simplify(points),
      distance: GpxParser.measureDistance(points),
      elevationGain: measureElevationGain(elevations),
      elevationLoss: measureElevationLoss(elevations),
      pointCount: points.length,
      bounds: GpxParser.measureBounds(points),
    };
  }

  private static readName(xml: string): string {
    const containers = ['trk', 'rte', 'metadata'];

    for (const container of containers) {
      const block = createElementPattern(container).exec(xml);
      const inner = block?.[2];

      if (!inner) {
        continue;
      }

      const name = createElementPattern('name').exec(inner)?.[2];

      if (name) {
        const decoded = decodeXmlText(name).trim();

        if (decoded) {
          return decoded;
        }
      }
    }

    return '';
  }

  private static readPoints(xml: string, tag: string): GpxTrackPoint[] {
    const pattern = createElementPattern(tag);
    const points: GpxTrackPoint[] = [];
    let match = pattern.exec(xml);

    while (match) {
      const attributes = match[1] ?? '';
      const latitude = toCoordinate(LATITUDE_PATTERN.exec(attributes)?.[1]);
      const longitude = toCoordinate(LONGITUDE_PATTERN.exec(attributes)?.[1]);

      // 좌표가 깨진 한 점 때문에 파일 전체를 거절하지 않는다 — 그 점만 버린다.
      if (
        latitude !== null &&
        longitude !== null &&
        Math.abs(latitude) <= GROUP_MAX_LATITUDE &&
        Math.abs(longitude) <= GROUP_MAX_LONGITUDE
      ) {
        points.push({
          latitude,
          longitude,
          elevation: toCoordinate(ELEVATION_PATTERN.exec(match[2] ?? '')?.[1]),
        });
      }

      match = pattern.exec(xml);
    }

    return points;
  }

  private static measureDistance(points: GpxTrackPoint[]): number {
    let distance = 0;

    for (let index = 1; index < points.length; index += 1) {
      distance += getDistanceInMeters(points[index - 1], points[index]);
    }

    return distance;
  }

  private static measureBounds(points: GpxTrackPoint[]): RouteBounds {
    const bounds: RouteBounds = {
      minLat: points[0].latitude,
      maxLat: points[0].latitude,
      minLng: points[0].longitude,
      maxLng: points[0].longitude,
    };

    for (const point of points) {
      bounds.minLat = Math.min(bounds.minLat, point.latitude);
      bounds.maxLat = Math.max(bounds.maxLat, point.latitude);
      bounds.minLng = Math.min(bounds.minLng, point.longitude);
      bounds.maxLng = Math.max(bounds.maxLng, point.longitude);
    }

    return bounds;
  }

  /**
   * 축약 (GRP-8, 500점 상한).
   *
   * 균등 샘플링이 아니라 **Douglas–Peucker**를 쓴다 — 균등 샘플링은 직선 구간에 점을 낭비하고
   * 급커브의 꼭짓점을 그대로 버려서, 능선처럼 굽이가 몰린 코스가 지도에서 다른 모양이 된다.
   * 허용 오차(m)를 1m에서 두 배씩 올리며 상한 아래로 떨어질 때까지 다시 돌린다 —
   * 오차를 미리 못 정하는 이유는 같은 500점이라도 100km 종주와 3km 둘레길이 요구하는 값이
   * 몇백 배 다르기 때문이다.
   */
  private static simplify(points: GpxTrackPoint[]): RouteCoordinate[] {
    return GpxParser.keepIndices(points).map(index =>
      GpxParser.toSimplifiedCoordinate(points[index])
    );
  }

  /**
   * 축약이 남긴 **원본 인덱스**를 돌려준다. 좌표로 바로 바꾸지 않는 이유는 고도 때문이다 —
   * 살아남은 점이 원본의 몇 번째였는지를 알아야 그 점의 `<ele>`를 그대로 실을 수 있고(GRP-8),
   * 좌표만 들고 다니면 축약 뒤에 고도를 되찾을 방법이 없다.
   */
  private static keepIndices(points: GpxTrackPoint[]): number[] {
    if (points.length <= GROUP_ROUTE_MAX_SIMPLIFIED_POINTS) {
      return points.map((_point, index) => index);
    }

    const projected = GpxParser.project(points);
    let tolerance = INITIAL_TOLERANCE_METERS;
    let kept = GpxParser.reduce(projected, tolerance);
    let step = 0;

    while (kept.length > GROUP_ROUTE_MAX_SIMPLIFIED_POINTS) {
      if (step >= MAX_TOLERANCE_STEPS) {
        return GpxParser.sampleEvenly(kept);
      }

      tolerance *= 2;
      kept = GpxParser.reduce(projected, tolerance);
      step += 1;
    }

    return kept;
  }

  /**
   * 축약 좌표 한 점. 고도가 기록되지 않은 점은 **키 자체를 생략한다** —
   * `exactOptionalPropertyTypes`가 켜져 있고, 그래프도 키의 유무로 "고도 없음"을 읽는다.
   */
  private static toSimplifiedCoordinate(point: GpxTrackPoint): RouteCoordinate {
    return {
      lat: point.latitude,
      lng: point.longitude,
      ...(point.elevation === null ? {} : { ele: point.elevation }),
    };
  }

  /**
   * 위경도를 지역 평면(m)으로 근사한다. 축약은 "선에서 얼마나 벗어났나"만 보므로 정밀한
   * 투영이 필요 없고, 경도를 위도 코사인으로 눌러 두면 고위도에서 가로로 늘어나지 않는다.
   */
  private static project(points: GpxTrackPoint[]): PlanarPoint[] {
    const middleLatitude = points[Math.floor(points.length / 2)].latitude;
    const longitudeScale =
      Math.cos(toRadians(middleLatitude)) * METERS_PER_LATITUDE_DEGREE;

    return points.map(point => ({
      x: point.longitude * longitudeScale,
      y: point.latitude * METERS_PER_LATITUDE_DEGREE,
    }));
  }

  // 재귀 대신 스택으로 돈다 — 수만 점짜리 트랙에서 호출 깊이가 터지지 않게.
  private static reduce(points: PlanarPoint[], tolerance: number): number[] {
    const keep = new Array<boolean>(points.length).fill(false);
    const stack: [number, number][] = [[0, points.length - 1]];

    keep[0] = true;
    keep[points.length - 1] = true;

    while (stack.length > 0) {
      const segment = stack.pop();

      if (!segment) {
        break;
      }

      const [first, last] = segment;
      let farthest = -1;
      let maxDistance = 0;

      for (let index = first + 1; index < last; index += 1) {
        const distance = GpxParser.measurePerpendicular(
          points[index],
          points[first],
          points[last]
        );

        if (distance > maxDistance) {
          maxDistance = distance;
          farthest = index;
        }
      }

      if (farthest >= 0 && maxDistance > tolerance) {
        keep[farthest] = true;
        stack.push([first, farthest], [farthest, last]);
      }
    }

    const kept: number[] = [];

    keep.forEach((value, index) => {
      if (value) {
        kept.push(index);
      }
    });

    return kept;
  }

  private static measurePerpendicular(
    point: PlanarPoint,
    start: PlanarPoint,
    end: PlanarPoint
  ): number {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;

    if (lengthSquared === 0) {
      return Math.hypot(point.x - start.x, point.y - start.y);
    }

    const ratio =
      ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared;
    const clamped = Math.min(1, Math.max(0, ratio));

    return Math.hypot(
      point.x - (start.x + clamped * dx),
      point.y - (start.y + clamped * dy)
    );
  }

  // 오차를 끝까지 올려도 안 줄면(같은 점이 수천 번 반복되는 파일 등) 마지막으로 솎아낸다.
  private static sampleEvenly(indices: number[]): number[] {
    const limit = GROUP_ROUTE_MAX_SIMPLIFIED_POINTS;
    const stride = (indices.length - 1) / (limit - 1);
    const sampled: number[] = [];

    for (let position = 0; position < limit; position += 1) {
      sampled.push(indices[Math.round(position * stride)]);
    }

    return sampled;
  }
}

export default GpxParser;
