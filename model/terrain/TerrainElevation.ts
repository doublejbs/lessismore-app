import UPNG from 'upng-js';
import { TERRAIN_TILE_URL_TEMPLATE } from '@/model/map/MapStyle';

// 지형 고도 타일(Terrarium) 공용 읽기 (OF-6 등고선 · RD-3 코스 그리기 고도 보강).

export interface TerrainTileKey {
  x: number;
  y: number;
}

// 좌표 하나 — 경위도(도).
export interface TerrainCoordinate {
  latitude: number;
  longitude: number;
}

export const TERRAIN_TILE_SIZE = 256;
// 코스 그리기가 고도를 읽는 줌(약 19m/px) — 등고선 격자와 같은 정밀도(RD-3).
export const TERRAIN_SAMPLE_ZOOM = 13;
// Terrarium 인코딩 오프셋(고도 = R×256 + G + B/256 − 32768).
const TERRARIUM_OFFSET = 32768;
const FETCH_CONCURRENCY = 4;
// 코스 그리기 고도 보강(RD-3) — 타일 상한·가장 낮은 줌·동시에 받는 장수·전체 타임아웃.
const MAX_SAMPLE_TILE_COUNT = 24;
const MIN_SAMPLE_ZOOM = 10;
const SAMPLE_FETCH_CONCURRENCY = 2;
const TERRAIN_SAMPLE_TIMEOUT_MS = 10000;

// 타일 한 장에서 읽을 좌표 — 결과 배열의 자리와 타일 RGBA 안의 바이트 오프셋.
interface SampleTilePixel {
  index: number;
  offset: number;
}

interface SampleTile {
  key: TerrainTileKey;
  samples: SampleTilePixel[];
}

interface SamplePlan {
  zoom: number;
  tiles: SampleTile[];
}

const yieldToJs = () =>
  new Promise<void>(resolve => {
    setTimeout(resolve, 0);
  });

// 전역 픽셀 좌표를 정수 픽셀로(세계 가장자리 안으로 자른다).
const clampPixel = (value: number, maxPixel: number) =>
  Math.min(maxPixel, Math.max(0, Math.floor(value)));

/**
 * 지형 고도 타일 (OF-6 · RD-3). AWS Terrain Tiles(Terrarium PNG)를 받아 `upng-js`로 디코딩하고 픽셀을 고도(m)로
 * 바꾼다. 등고선 계산(`OfflineContours`)과 코스 그리기의 고도 보강(`RouteDraw`)이 **같은 타일·같은 공식**을 쓴다 —
 * 두 벌로 두면 같은 자리의 고도가 기능마다 달라진다.
 */
class TerrainElevation {
  public static getWorldSize(zoom: number): number {
    return TERRAIN_TILE_SIZE * 2 ** zoom;
  }

  // 웹 메르카토르: 경위도 → 줌 `zoom`의 전역 픽셀 좌표.
  public static lngToPixelX(lng: number, zoom: number): number {
    return ((lng + 180) / 360) * TerrainElevation.getWorldSize(zoom);
  }

  public static latToPixelY(lat: number, zoom: number): number {
    const sin = Math.sin((lat * Math.PI) / 180);

    return (
      (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) *
      TerrainElevation.getWorldSize(zoom)
    );
  }

  public static pixelXToLng(x: number, zoom: number): number {
    return (x / TerrainElevation.getWorldSize(zoom)) * 360 - 180;
  }

  public static pixelYToLat(y: number, zoom: number): number {
    const n = Math.PI * (1 - (2 * y) / TerrainElevation.getWorldSize(zoom));

    return (Math.atan(Math.sinh(n)) * 180) / Math.PI;
  }

  public static getTileUrl(key: TerrainTileKey, zoom: number): string {
    return TERRAIN_TILE_URL_TEMPLATE.replace('{z}', String(zoom))
      .replace('{x}', String(key.x))
      .replace('{y}', String(key.y));
  }

  // RGBA 바이트 배열의 `offset`(픽셀 × 4) 자리 고도(m).
  public static decodeElevation(rgba: Uint8Array, offset: number): number {
    return (
      rgba[offset] * 256 +
      rgba[offset + 1] +
      rgba[offset + 2] / 256 -
      TERRARIUM_OFFSET
    );
  }

  // 고도 타일 한 장 → RGBA 바이트. 실패하면 던진다.
  public static async fetchTile(
    key: TerrainTileKey,
    zoom: number,
    signal?: AbortSignal
  ): Promise<Uint8Array> {
    const response = await fetch(
      TerrainElevation.getTileUrl(key, zoom),
      signal ? { signal } : {}
    );

    if (!response.ok) {
      throw new Error(`terrain tile ${response.status}`);
    }

    const image = UPNG.decode(await response.arrayBuffer());

    if (
      image.width !== TERRAIN_TILE_SIZE ||
      image.height !== TERRAIN_TILE_SIZE
    ) {
      throw new Error('terrain tile size mismatch');
    }

    const frame = UPNG.toRGBA8(image)[0];

    if (!frame) {
      throw new Error('terrain tile decode failed');
    }

    return new Uint8Array(frame);
  }

  // 실패하면 한 번 더 받아 본다. 그래도 실패하면 던진다.
  public static async fetchTileWithRetry(
    key: TerrainTileKey,
    zoom: number,
    signal?: AbortSignal
  ): Promise<Uint8Array> {
    try {
      return await TerrainElevation.fetchTile(key, zoom, signal);
    } catch (error) {
      if (signal?.aborted) {
        throw error;
      }

      return TerrainElevation.fetchTile(key, zoom, signal);
    }
  }

  // 타일들을 동시에 `FETCH_CONCURRENCY`장까지 받는다. 한 장이라도 끝내 실패하면 던진다.
  public static async fetchTiles(
    keys: TerrainTileKey[],
    zoom: number,
    signal?: AbortSignal
  ): Promise<Uint8Array[]> {
    const results: Uint8Array[] = new Array(keys.length);
    let next = 0;

    const runWorker = async () => {
      while (next < keys.length) {
        const index = next;

        next += 1;
        results[index] = await TerrainElevation.fetchTileWithRetry(
          keys[index],
          zoom,
          signal
        );
      }
    };

    const workers = Array.from(
      { length: Math.min(FETCH_CONCURRENCY, keys.length) },
      () => runWorker()
    );

    await Promise.all(workers);

    return results;
  }

  /**
   * 좌표마다 고도(m)를 읽는다 (RD-3). 픽셀은 가장 가까운 값이다(보간 없음).
   *
   * - 타일은 키별로 한 번만 받는다(선 하나가 보통 1~4장). 줌 13에서 `MAX_SAMPLE_TILE_COUNT`장을 넘으면(수십 km 직선)
   *   한 단씩 줌을 낮춰 다시 세고, 줌 10까지 내려도 넘으면 `null`이다.
   * - 타일마다 디코딩 직후 **필요한 픽셀 고도만 뽑고 RGBA 버퍼(장당 256KB)를 버린다** — 동시에 들고 있는 버퍼는
   *   받는 동시성(`SAMPLE_FETCH_CONCURRENCY`)만큼뿐이다. 타일 사이마다 JS 스레드를 양보한다(저장 중에도 화면이 멈추지 않게).
   * - 전체에 `TERRAIN_SAMPLE_TIMEOUT_MS` 타임아웃을 건다 — 넘으면 받는 중인 요청을 끊고 `null`.
   * - **타일을 하나라도 못 받으면 `null`** — 호출자는 고도 없이 저장한다(일부만 고도가 있으면 그래프가 끊겨 읽힌다).
   */
  public static async sampleMany(
    coordinates: readonly TerrainCoordinate[],
    zoom: number = TERRAIN_SAMPLE_ZOOM
  ): Promise<number[] | null> {
    if (coordinates.length === 0) {
      return [];
    }

    const plan = TerrainElevation.planSamples(coordinates, zoom);

    if (!plan) {
      console.warn(
        '[TerrainElevation] 고도 타일이 너무 많아 고도를 읽지 않아요'
      ); // l10n-ignore: 개발자 로그

      return null;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, TERRAIN_SAMPLE_TIMEOUT_MS);

    try {
      const elevations = new Array<number>(coordinates.length).fill(Number.NaN);
      const tiles = plan.tiles;
      let next = 0;

      const runWorker = async () => {
        while (next < tiles.length && !controller.signal.aborted) {
          const tile = tiles[next];

          next += 1;

          const rgba = await TerrainElevation.fetchTileWithRetry(
            tile.key,
            plan.zoom,
            controller.signal
          );

          // 필요한 픽셀만 뽑는다 — 버퍼는 이 블록을 벗어나면 참조가 끊겨 GC가 거둔다.
          tile.samples.forEach(sample => {
            elevations[sample.index] = TerrainElevation.decodeElevation(
              rgba,
              sample.offset
            );
          });

          await yieldToJs();
        }
      };

      await Promise.all(
        Array.from(
          { length: Math.min(SAMPLE_FETCH_CONCURRENCY, tiles.length) },
          () => runWorker()
        )
      );

      if (controller.signal.aborted) {
        console.warn('[TerrainElevation] 고도 타일 읽기 시간 초과'); // l10n-ignore: 개발자 로그

        return null;
      }

      for (const elevation of elevations) {
        if (!Number.isFinite(elevation)) {
          return null;
        }
      }

      return elevations;
    } catch (error) {
      console.warn('[TerrainElevation] 고도 타일 읽기 실패', error); // l10n-ignore: 개발자 로그

      return null;
    } finally {
      clearTimeout(timer);
      // 한 장이 실패해 전체를 `null`로 돌릴 때 남은 작업자가 나머지 타일을 계속 받지 않게 끊는다(정상 완료 뒤 불러도 해가 없다).
      controller.abort();
    }
  }

  /**
   * 좌표를 타일별로 묶는다 — 줌 `zoom`부터 타일이 상한 안에 들 때까지 한 단씩 낮춘다. 줌 10까지 넘으면 `null`.
   */
  private static planSamples(
    coordinates: readonly TerrainCoordinate[],
    zoom: number
  ): SamplePlan | null {
    for (let current = zoom; current >= MIN_SAMPLE_ZOOM; current -= 1) {
      const maxPixel = TerrainElevation.getWorldSize(current) - 1;
      const tilesById = new Map<string, SampleTile>();

      coordinates.forEach((coordinate, index) => {
        const x = clampPixel(
          TerrainElevation.lngToPixelX(coordinate.longitude, current),
          maxPixel
        );
        const y = clampPixel(
          TerrainElevation.latToPixelY(coordinate.latitude, current),
          maxPixel
        );
        const key = {
          x: Math.floor(x / TERRAIN_TILE_SIZE),
          y: Math.floor(y / TERRAIN_TILE_SIZE),
        };
        const id = `${key.x}/${key.y}`;
        const tile = tilesById.get(id) ?? { key, samples: [] };
        const localX = x - key.x * TERRAIN_TILE_SIZE;
        const localY = y - key.y * TERRAIN_TILE_SIZE;

        tile.samples.push({
          index,
          offset: (localY * TERRAIN_TILE_SIZE + localX) * 4,
        });
        tilesById.set(id, tile);
      });

      if (tilesById.size <= MAX_SAMPLE_TILE_COUNT) {
        return { zoom: current, tiles: [...tilesById.values()] };
      }
    }

    return null;
  }
}

export default TerrainElevation;
