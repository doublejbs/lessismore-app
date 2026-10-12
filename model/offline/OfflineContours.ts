import { contours } from 'd3-contour';
import type {
  Feature,
  FeatureCollection,
  MultiLineString,
  Position,
} from 'geojson';
import UPNG from 'upng-js';
import type { OfflineLngLatBounds } from './OfflineMapBounds';
import { TERRAIN_TILE_URL_TEMPLATE } from '@/model/map/MapStyle';

// 등고선 계산 (OF-6). 저장 시 한 번, 앱 안에서 순수 JS로 계산한다(서버 없음).

export interface OfflineContourProperties {
  // 고도(m).
  ele: number;
  // 100m 배수 — 지도가 굵게 그리고 고도 라벨을 단다.
  major: boolean;
}

export type OfflineContourCollection = FeatureCollection<
  MultiLineString,
  OfflineContourProperties
>;

interface BuildOptions {
  signal?: AbortSignal;
}

interface TileKey {
  x: number;
  y: number;
}

interface PixelRange {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

// 고도 타일 줌(약 19m/px). 영역이 넓어 타일이 상한을 넘으면 한 단씩 내린다.
const CONTOUR_TILE_ZOOM = 13;
const MIN_CONTOUR_TILE_ZOOM = 10;
const MAX_TILE_COUNT = 64;
const TILE_SIZE = 256;
const FETCH_CONCURRENCY = 4;
// 등고선 간격(m). 임계값이 너무 많으면(높이 차가 큰 영역) 넓은 간격으로 바꾼다.
const CONTOUR_INTERVAL = 20;
const WIDE_CONTOUR_INTERVAL = 50;
const MAX_THRESHOLD_COUNT = 120;
const MAJOR_INTERVAL = 100;
// 좌표 축약 — 이 길이보다 짧은 링은 그대로 둔다. 전체 점이 상한을 넘으면 minor 링을 더 솎는다.
const MIN_RING_LENGTH_TO_THIN = 8;
const DEFAULT_THIN_STEP = 2;
const HEAVY_THIN_STEP = 4;
const MAX_TOTAL_POINTS = 200000;
const COORDINATE_PRECISION = 1e5;
// Terrarium 인코딩 오프셋(고도 = R×256 + G + B/256 − 32768).
const TERRARIUM_OFFSET = 32768;

const yieldToJs = () =>
  new Promise<void>(resolve => {
    setTimeout(resolve, 0);
  });

const getWorldSize = (zoom: number) => TILE_SIZE * 2 ** zoom;

// 웹 메르카토르: 경위도 → 줌 `zoom`의 전역 픽셀 좌표.
const lngToPixelX = (lng: number, zoom: number) =>
  ((lng + 180) / 360) * getWorldSize(zoom);

const latToPixelY = (lat: number, zoom: number) => {
  const sin = Math.sin((lat * Math.PI) / 180);

  return (
    (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * getWorldSize(zoom)
  );
};

const pixelXToLng = (x: number, zoom: number) =>
  (x / getWorldSize(zoom)) * 360 - 180;

const pixelYToLat = (y: number, zoom: number) => {
  const n = Math.PI * (1 - (2 * y) / getWorldSize(zoom));

  return (Math.atan(Math.sinh(n)) * 180) / Math.PI;
};

const round = (value: number) =>
  Math.round(value * COORDINATE_PRECISION) / COORDINATE_PRECISION;

// 영역이 덮는 전역 픽셀 범위(격자는 영역만큼만 잘라 계산한다).
const getPixelRange = (
  bounds: OfflineLngLatBounds,
  zoom: number
): PixelRange => {
  const [west, south, east, north] = bounds;
  const minX = Math.floor(lngToPixelX(west, zoom));
  const maxX = Math.ceil(lngToPixelX(east, zoom));
  const minY = Math.floor(latToPixelY(north, zoom));
  const maxY = Math.ceil(latToPixelY(south, zoom));

  return {
    minX,
    minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
};

const getTileKeys = (range: PixelRange, zoom: number): TileKey[] => {
  const maxTile = 2 ** zoom - 1;
  const minTileX = Math.max(0, Math.floor(range.minX / TILE_SIZE));
  const maxTileX = Math.min(
    maxTile,
    Math.floor((range.minX + range.width - 1) / TILE_SIZE)
  );
  const minTileY = Math.max(0, Math.floor(range.minY / TILE_SIZE));
  const maxTileY = Math.min(
    maxTile,
    Math.floor((range.minY + range.height - 1) / TILE_SIZE)
  );
  const keys: TileKey[] = [];

  for (let y = minTileY; y <= maxTileY; y += 1) {
    for (let x = minTileX; x <= maxTileX; x += 1) {
      keys.push({ x, y });
    }
  }

  return keys;
};

const getTileUrl = (key: TileKey, zoom: number) =>
  TERRAIN_TILE_URL_TEMPLATE.replace('{z}', String(zoom))
    .replace('{x}', String(key.x))
    .replace('{y}', String(key.y));

// 고도 타일 한 장 → RGBA 바이트. 실패하면 던진다.
const fetchTile = async (
  key: TileKey,
  zoom: number,
  signal: AbortSignal | undefined
): Promise<Uint8Array> => {
  const response = await fetch(getTileUrl(key, zoom), signal ? { signal } : {});

  if (!response.ok) {
    throw new Error(`terrain tile ${response.status}`);
  }

  const image = UPNG.decode(await response.arrayBuffer());

  if (image.width !== TILE_SIZE || image.height !== TILE_SIZE) {
    throw new Error('terrain tile size mismatch');
  }

  const frame = UPNG.toRGBA8(image)[0];

  if (!frame) {
    throw new Error('terrain tile decode failed');
  }

  return new Uint8Array(frame);
};

// 실패하면 한 번 더 받아 본다. 그래도 실패하면 던진다.
const fetchTileWithRetry = async (
  key: TileKey,
  zoom: number,
  signal: AbortSignal | undefined
): Promise<Uint8Array> => {
  try {
    return await fetchTile(key, zoom, signal);
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }

    return fetchTile(key, zoom, signal);
  }
};

// 타일들을 동시에 `FETCH_CONCURRENCY`장까지 받는다. 한 장이라도 끝내 실패하면 던진다.
const fetchTiles = async (
  keys: TileKey[],
  zoom: number,
  signal: AbortSignal | undefined
): Promise<Uint8Array[]> => {
  const results: Uint8Array[] = new Array(keys.length);
  let next = 0;

  const runWorker = async () => {
    while (next < keys.length) {
      const index = next;

      next += 1;
      results[index] = await fetchTileWithRetry(keys[index], zoom, signal);
    }
  };

  const workers = Array.from(
    { length: Math.min(FETCH_CONCURRENCY, keys.length) },
    () => runWorker()
  );

  await Promise.all(workers);

  return results;
};

// 받은 타일을 영역 크기의 고도 격자 하나로 잇는다(행 우선, 위 → 아래). 메모리를 아끼려고 `Float32Array`
// (고도 m — 32비트 정밀도로 충분하다).
const buildGrid = (
  keys: TileKey[],
  tiles: Uint8Array[],
  range: PixelRange
): Float32Array => {
  const values = new Float32Array(range.width * range.height);

  keys.forEach((key, index) => {
    const rgba = tiles[index];
    const tileOriginX = key.x * TILE_SIZE;
    const tileOriginY = key.y * TILE_SIZE;
    const startX = Math.max(range.minX, tileOriginX);
    const endX = Math.min(range.minX + range.width, tileOriginX + TILE_SIZE);
    const startY = Math.max(range.minY, tileOriginY);
    const endY = Math.min(range.minY + range.height, tileOriginY + TILE_SIZE);

    for (let globalY = startY; globalY < endY; globalY += 1) {
      const tileRow = (globalY - tileOriginY) * TILE_SIZE;
      const gridRow = (globalY - range.minY) * range.width;

      for (let globalX = startX; globalX < endX; globalX += 1) {
        const offset = (tileRow + (globalX - tileOriginX)) * 4;

        values[gridRow + (globalX - range.minX)] =
          rgba[offset] * 256 +
          rgba[offset + 1] +
          rgba[offset + 2] / 256 -
          TERRARIUM_OFFSET;
      }
    }
  });

  return values;
};

const getThresholds = (values: Float32Array): number[] => {
  let min = Infinity;
  let max = -Infinity;

  for (const value of values) {
    if (value < min) {
      min = value;
    }

    if (value > max) {
      max = value;
    }
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return [];
  }

  const build = (step: number) => {
    const thresholds: number[] = [];

    for (
      let value = Math.ceil(min / step) * step;
      value <= max;
      value += step
    ) {
      thresholds.push(value);
    }

    return thresholds;
  };

  const thresholds = build(CONTOUR_INTERVAL);

  return thresholds.length > MAX_THRESHOLD_COUNT
    ? build(WIDE_CONTOUR_INTERVAL)
    : thresholds;
};

// 링을 `step`점 중 1점만 남겨 줄인다(끝점은 남겨 닫힌 링이 끊기지 않게). 짧은 링은 그대로.
const thinRing = (ring: Position[], step: number): Position[] => {
  if (ring.length < MIN_RING_LENGTH_TO_THIN || step <= 1) {
    return ring;
  }

  const thinned = ring.filter((_, index) => index % step === 0);
  const last = ring[ring.length - 1];

  if (thinned[thinned.length - 1] !== last) {
    thinned.push(last);
  }

  return thinned;
};

const toLngLatRing = (
  ring: Position[],
  range: PixelRange,
  zoom: number
): Position[] => {
  return ring.map(([x, y]) => [
    round(pixelXToLng(range.minX + x, zoom)),
    round(pixelYToLat(range.minY + y, zoom)),
  ]);
};

interface RawContour {
  ele: number;
  // 격자 픽셀 좌표의 선들(폴리곤 외곽·구멍 구분 없이 선으로 쓴다 — 격자 테두리 구간은 뺐다).
  rings: Position[][];
}

// 격자 테두리에서 이만큼(px) 안이면 테두리 위로 본다.
const BORDER_TOLERANCE = 0.5;

/**
 * d3-contour는 격자 바깥을 가장 낮은 값으로 보고 폴리곤을 격자 테두리를 따라 닫는다. 그 구간은 실제
 * 등고선이 아니고 모든 고도에서 겹쳐 저장 영역 가장자리에 굵은 테두리를 그리므로, **같은 테두리 위의
 * 두 점을 잇는 선분**에서 링을 끊어 버린다. 남는 선(2점 이상)들을 돌려준다.
 */
const splitAtBorder = (
  ring: Position[],
  width: number,
  height: number
): Position[][] => {
  const getBorderMask = ([x, y]: Position) =>
    (x <= BORDER_TOLERANCE ? 1 : 0) |
    (x >= width - BORDER_TOLERANCE ? 2 : 0) |
    (y <= BORDER_TOLERANCE ? 4 : 0) |
    (y >= height - BORDER_TOLERANCE ? 8 : 0);
  const lines: Position[][] = [];
  let current: Position[] = ring.length > 0 ? [ring[0]] : [];

  for (let index = 1; index < ring.length; index += 1) {
    const point = ring[index];
    const isBorderSegment =
      (getBorderMask(ring[index - 1]) & getBorderMask(point)) !== 0;

    if (isBorderSegment) {
      if (current.length >= 2) {
        lines.push(current);
      }

      current = [point];
    } else {
      current.push(point);
    }
  }

  if (current.length >= 2) {
    lines.push(current);
  }

  return lines;
};

const toFeatures = (
  raw: RawContour[],
  range: PixelRange,
  zoom: number,
  minorStep: number
): {
  features: Feature<MultiLineString, OfflineContourProperties>[];
  points: number;
} => {
  let points = 0;
  const features = raw.map(contour => {
    const major = contour.ele % MAJOR_INTERVAL === 0;
    const step = major ? DEFAULT_THIN_STEP : minorStep;
    const coordinates = contour.rings.map(ring =>
      toLngLatRing(thinRing(ring, step), range, zoom)
    );

    coordinates.forEach(ring => {
      points += ring.length;
    });

    const feature: Feature<MultiLineString, OfflineContourProperties> = {
      type: 'Feature',
      geometry: { type: 'MultiLineString', coordinates },
      properties: { ele: contour.ele, major },
    };

    return feature;
  });

  return { features, points };
};

// 타일 수가 상한 안에 드는 가장 높은 줌. 끝까지 넘으면 `null`.
const pickZoom = (
  bounds: OfflineLngLatBounds
): { zoom: number; range: PixelRange; keys: TileKey[] } | null => {
  for (let zoom = CONTOUR_TILE_ZOOM; zoom >= MIN_CONTOUR_TILE_ZOOM; zoom -= 1) {
    const range = getPixelRange(bounds, zoom);
    const keys = getTileKeys(range, zoom);

    if (keys.length > 0 && keys.length <= MAX_TILE_COUNT) {
      return { zoom, range, keys };
    }
  }

  return null;
};

/**
 * 영역의 등고선 (OF-6 · §4 `contours.json`). 줌 13 고도 타일(타일이 64장을 넘으면 줌을 낮춘다)을 받아
 * 20m 간격(임계값이 120개를 넘으면 50m) 등고선을 `MultiLineString` 피처로 만든다.
 * 실패(타일을 끝내 못 받음·디코드 실패·중단)하면 **던지지 않고 `null`** — 저장은 등고선 없이 계속된다.
 */
export const buildOfflineContours = async (
  bounds: OfflineLngLatBounds,
  options: BuildOptions = {}
): Promise<OfflineContourCollection | null> => {
  const { signal } = options;

  try {
    const picked = pickZoom(bounds);

    if (!picked) {
      console.warn('[OfflineContours] 영역이 너무 넓어 등고선을 만들지 않아요'); // l10n-ignore: 개발자 로그

      return null;
    }

    const { zoom, range, keys } = picked;
    let tiles: Uint8Array[] | null = await fetchTiles(keys, zoom, signal);

    if (signal?.aborted) {
      return null;
    }

    const values = buildGrid(keys, tiles, range);

    // 격자를 만들었으니 타일 RGBA 버퍼(장당 256KB)는 참조를 끊어 GC가 거둬 가게 한다.
    tiles = null;

    const thresholds = getThresholds(values);
    const generator = contours().size([range.width, range.height]);
    // d3-contour는 인덱스로만 읽는다 — 타입 선언만 `number[]`라 그대로 넘긴다.
    const grid = values as unknown as number[];
    const raw: RawContour[] = [];

    for (const threshold of thresholds) {
      // 임계값 하나(격자 전체 마칭 스퀘어)마다 JS 스레드를 양보한다 — 저장 중에도 화면이 멈추지 않게.
      await yieldToJs();

      if (signal?.aborted) {
        return null;
      }

      const polygon = generator.contour(grid, threshold);
      const rings = polygon.coordinates
        .flat()
        .flatMap(ring => splitAtBorder(ring, range.width, range.height));

      if (rings.length > 0) {
        raw.push({ ele: threshold, rings });
      }
    }

    let result = toFeatures(raw, range, zoom, DEFAULT_THIN_STEP);

    if (result.points > MAX_TOTAL_POINTS) {
      result = toFeatures(raw, range, zoom, HEAVY_THIN_STEP);
    }

    return { type: 'FeatureCollection', features: result.features };
  } catch (error) {
    console.warn('[OfflineContours] 등고선 계산 실패', error); // l10n-ignore: 개발자 로그

    return null;
  }
};

export const isOfflineContourCollection = (
  value: unknown
): value is OfflineContourCollection => {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { type?: unknown }).type === 'FeatureCollection' &&
    Array.isArray((value as { features?: unknown }).features)
  );
};
