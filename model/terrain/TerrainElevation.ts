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
   * 좌표마다 고도(m)를 읽는다 (RD-3). 타일은 키별로 한 번만 받고(선 하나가 보통 1~4장), 픽셀은 가장 가까운 값이다
   * (보간 없음). **타일을 하나라도 못 받으면 `null`** — 호출자는 고도 없이 저장한다(일부만 고도가 있으면 그래프가
   * 끊겨 읽힌다).
   */
  public static async sampleMany(
    coordinates: readonly TerrainCoordinate[],
    zoom: number = TERRAIN_SAMPLE_ZOOM
  ): Promise<number[] | null> {
    if (coordinates.length === 0) {
      return [];
    }

    const maxPixel = TerrainElevation.getWorldSize(zoom) - 1;
    const pixels = coordinates.map(coordinate => ({
      x: Math.min(
        maxPixel,
        Math.max(
          0,
          Math.floor(TerrainElevation.lngToPixelX(coordinate.longitude, zoom))
        )
      ),
      y: Math.min(
        maxPixel,
        Math.max(
          0,
          Math.floor(TerrainElevation.latToPixelY(coordinate.latitude, zoom))
        )
      ),
    }));
    const toKeyId = (key: TerrainTileKey) => `${key.x}/${key.y}`;
    const keysById = new Map<string, TerrainTileKey>();

    pixels.forEach(pixel => {
      const key = {
        x: Math.floor(pixel.x / TERRAIN_TILE_SIZE),
        y: Math.floor(pixel.y / TERRAIN_TILE_SIZE),
      };

      keysById.set(toKeyId(key), key);
    });

    try {
      const keys = [...keysById.values()];
      const tiles = await TerrainElevation.fetchTiles(keys, zoom);
      const tilesById = new Map<string, Uint8Array>();

      keys.forEach((key, index) => {
        tilesById.set(toKeyId(key), tiles[index]);
      });

      const elevations: number[] = [];

      for (const pixel of pixels) {
        const key = {
          x: Math.floor(pixel.x / TERRAIN_TILE_SIZE),
          y: Math.floor(pixel.y / TERRAIN_TILE_SIZE),
        };
        const rgba = tilesById.get(toKeyId(key));

        if (!rgba) {
          return null;
        }

        const localX = pixel.x - key.x * TERRAIN_TILE_SIZE;
        const localY = pixel.y - key.y * TERRAIN_TILE_SIZE;
        const elevation = TerrainElevation.decodeElevation(
          rgba,
          (localY * TERRAIN_TILE_SIZE + localX) * 4
        );

        if (!Number.isFinite(elevation)) {
          return null;
        }

        elevations.push(elevation);
      }

      return elevations;
    } catch (error) {
      console.warn('[TerrainElevation] 고도 타일 읽기 실패', error); // l10n-ignore: 개발자 로그

      return null;
    }
  }
}

export default TerrainElevation;
