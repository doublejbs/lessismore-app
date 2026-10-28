import { Platform } from 'react-native';
import type { OfflineLngLatBounds } from './OfflineMapBounds';
import { isOfflineLngLatBounds } from './OfflineMapBounds';
import {
  loadOfflineManager,
  MapLibreOfflineManager,
} from '@/model/map/MapLibreModule';
import { MAP_STYLE_URL, MAP_STYLE_VERSION } from '@/model/map/MapStyle';

// 팩 줌 범위(OF-1). 타일 수 상한에 걸리면 줌 상한을 한 단씩(최저 12) 내린다(§6).
const PACK_MIN_ZOOM = 9;
const PACK_MAX_ZOOM = 14;
const PACK_LOWEST_MAX_ZOOM = 12;
// 네이티브 팩 타일 수 상한(MapLibre 기본 6,000장). 받기 전에 영역·줌 범위로 직접 세어 줌 상한을 고른다.
const PACK_TILE_COUNT_LIMIT = 6000;
// 팩에 담기는 타일 소스 수(벡터 + 고도 raster-dem). 소스마다 같은 줌 범위의 타일을 받는다.
const PACK_TILE_SOURCE_COUNT = 2;
// 팩 하나를 받는 최대 시간. 넘기면 실패로 본다(지도 없는 저장본은 남기지 않는다 — OF-2).
const PACK_DOWNLOAD_TIMEOUT_MS = 10 * 60 * 1000;
// 타일 수 상한 오류 메시지 조각(iOS `Tile limit exceeded` · 안드로이드 `Mapbox tile limit exceeded {n}`).
const TILE_LIMIT_PATTERNS = ['tile limit', 'tile count', 'tilecount'];

type MapLibreOfflinePack = Awaited<
  ReturnType<MapLibreOfflineManager['getPacks']>
>[number];

export interface OfflineMapPackResult {
  // 받은 리소스 크기(바이트, 타일 + 스타일·글리프·스프라이트).
  bytes: number;
  // 새로 만든 팩의 id. 웹(no-op)이면 `null`.
  packId: string | null;
}

interface PackRequest {
  bagId: string;
  ownerId: string;
  bounds: OfflineLngLatBounds;
  maxZoom: number;
}

// 저장이 중단됐을 때(오프라인 전환·로그아웃) 던지는 오류.
export class OfflineMapPackAbortError extends Error {
  public constructor() {
    super('offline pack download aborted');
    this.name = 'OfflineMapPackAbortError';
  }
}

// 웹 메르카토르 타일 인덱스로 센 영역의 타일 수(줌 `minZoom`~`maxZoom`, 소스 하나).
const countTiles = (
  bounds: OfflineLngLatBounds,
  minZoom: number,
  maxZoom: number
): number => {
  const [west, south, east, north] = bounds;
  const toTileX = (lng: number, zoom: number) =>
    Math.floor(((lng + 180) / 360) * 2 ** zoom);
  const toTileY = (lat: number, zoom: number) => {
    const clamped = Math.max(-85.0511, Math.min(85.0511, lat));
    const rad = (clamped * Math.PI) / 180;

    return Math.floor(
      ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) *
        2 ** zoom
    );
  };
  let count = 0;

  for (let zoom = minZoom; zoom <= maxZoom; zoom += 1) {
    const maxIndex = 2 ** zoom - 1;
    const minX = Math.max(0, toTileX(west, zoom));
    const maxX = Math.min(maxIndex, toTileX(east, zoom));
    const minY = Math.max(0, toTileY(north, zoom));
    const maxY = Math.min(maxIndex, toTileY(south, zoom));

    count += (maxX - minX + 1) * (maxY - minY + 1);
  }

  return count;
};

// 타일 수(벡터 + 고도)가 상한 안에 드는 가장 높은 줌 상한. 12에서도 넘으면 12(네이티브 상한 오류가 보조).
const pickPackMaxZoom = (bounds: OfflineLngLatBounds): number => {
  for (let zoom = PACK_MAX_ZOOM; zoom > PACK_LOWEST_MAX_ZOOM; zoom -= 1) {
    const tiles =
      countTiles(bounds, PACK_MIN_ZOOM, zoom) * PACK_TILE_SOURCE_COUNT;

    if (tiles <= PACK_TILE_COUNT_LIMIT) {
      return zoom;
    }
  }

  return PACK_LOWEST_MAX_ZOOM;
};

const isTileLimitError = (error: unknown): boolean => {
  const message = String(
    (error as { message?: unknown } | null)?.message ?? error ?? ''
  ).toLowerCase();

  return TILE_LIMIT_PATTERNS.some(pattern => message.includes(pattern));
};

const getPackBagId = (pack: MapLibreOfflinePack): string | null => {
  const bagId = pack.metadata?.bagId;

  return typeof bagId === 'string' ? bagId : null;
};

// 네이티브 오프라인 모듈. 네이티브인데 모듈이 없으면(옛 바이너리) 던진다 — 웹은 호출 전에 걸러 no-op.
const requireManager = (): MapLibreOfflineManager => {
  const manager = loadOfflineManager();

  if (!manager) {
    console.warn('[OfflineMapPack] MapLibre 오프라인 모듈이 없어요'); // l10n-ignore: 개발자 로그

    throw new Error('MapLibre offline module is not available');
  }

  return manager;
};

/**
 * MapLibre 오프라인 지도 팩 (OF-1 · OF-2 · §6). 여행 한 건에 팩 하나 — 메타데이터 `{ bagId, ownerId,
 * styleVersion }`로 찾는다. 저장본 디렉터리와 독립이라 디렉터리를 바꾸기 전에 받을 수 있다.
 *
 * 웹에서는 모두 no-op이다(§5). 오류는 개발자 로그를 남기고 던진다 — 저장 실패로 이어져야 한다.
 */
class OfflineMapPack {
  /**
   * 영역의 팩을 새로 받는다. 줌 상한은 받기 전에 타일 수(벡터 + 고도 ≤ 6,000장)로 고르고(14 → 13 → 12),
   * 그래도 네이티브가 타일 수 상한 오류를 보내면 한 단 내려 다시 받는다(§6). 실패하면 받던 팩을 지우고 던진다.
   *
   * `signal`이 중단되면(오프라인 전환·로그아웃) 즉시 받던 팩을 지우고 `OfflineMapPackAbortError`로 던진다.
   *
   * 같은 `bagId`의 옛 팩은 **여기서 지우지 않는다** — 갱신이 실패하면 기존 저장본이 옛 팩과 함께 남아야
   * 한다(OF-2). 새 저장본이 자리를 잡은 뒤 `removeExcept(bagId, packId)`로 옛 팩(받다 만 `inactive`
   * 포함 — §6)을 지운다. 리소스는 팩끼리 공유되므로 잠시 두 팩이 있어도 용량이 두 배가 되지 않는다.
   */
  public static async download(
    bagId: string,
    ownerId: string,
    bounds: OfflineLngLatBounds,
    onProgress: (percentage: number) => void,
    signal?: AbortSignal
  ): Promise<OfflineMapPackResult> {
    if (Platform.OS === 'web') {
      return { bytes: 0, packId: null };
    }

    if (signal?.aborted) {
      throw new OfflineMapPackAbortError();
    }

    const manager = requireManager();
    const createdIds: string[] = [];
    const handleCreated = (packId: string) => {
      if (!createdIds.includes(packId)) {
        createdIds.push(packId);
      }
    };

    let maxZoom = pickPackMaxZoom(bounds);

    try {
      for (;;) {
        try {
          return await OfflineMapPack.downloadOnce(
            manager,
            { bagId, ownerId, bounds, maxZoom },
            onProgress,
            handleCreated,
            signal
          );
        } catch (error) {
          if (!isTileLimitError(error) || maxZoom <= PACK_LOWEST_MAX_ZOOM) {
            throw error;
          }

          maxZoom -= 1;
          console.warn(`[OfflineMapPack] 타일 수 상한 — 줌 ${maxZoom}으로 다시 받아요`); // l10n-ignore: 개발자 로그
          await OfflineMapPack.removeWith(manager, pack =>
            createdIds.includes(pack.id)
          );
        }
      }
    } catch (error) {
      console.warn('[OfflineMapPack] 지도 팩 받기 실패', error); // l10n-ignore: 개발자 로그
      await OfflineMapPack.removeWith(manager, pack =>
        createdIds.includes(pack.id)
      ).catch(() => undefined);

      throw error;
    }
  }

  // 이 여행의 팩 중 `keepPackId`가 아닌 것(옛 팩·받다 만 팩)을 지운다. 새 저장본이 자리를 잡은 뒤 부른다.
  public static async removeExcept(
    bagId: string,
    keepPackId: string
  ): Promise<void> {
    await OfflineMapPack.removeMatching(
      pack => getPackBagId(pack) === bagId && pack.id !== keepPackId,
      '옛 지도 팩 삭제 실패' // l10n-ignore: 개발자 로그
    );
  }

  // 팩 하나를 지운다(받은 뒤 저장본 교체가 실패했을 때).
  public static async removePack(packId: string): Promise<void> {
    await OfflineMapPack.removeMatching(
      pack => pack.id === packId,
      '지도 팩 삭제 실패' // l10n-ignore: 개발자 로그
    );
  }

  // 이 여행의 팩을 모두 지운다(저장 삭제·배낭 삭제 — OF-2).
  public static async remove(bagId: string): Promise<void> {
    await OfflineMapPack.removeMatching(
      pack => getPackBagId(pack) === bagId,
      '지도 팩 삭제 실패' // l10n-ignore: 개발자 로그
    );
  }

  // 모든 팩을 지운다(로그아웃·탈퇴 — 같은 기기의 다른 사용자에게 남의 지도가 남지 않게, OF-2).
  public static async removeAll(): Promise<void> {
    await OfflineMapPack.removeMatching(
      () => true,
      '지도 팩 전체 삭제 실패' // l10n-ignore: 개발자 로그
    );
  }

  // 매니페스트에 없는 여행의 팩(고아)을 지운다(초기화 때 — §6).
  public static async removeOrphans(keepBagIds: string[]): Promise<void> {
    const keep = new Set(keepBagIds);

    await OfflineMapPack.removeMatching(pack => {
      const bagId = getPackBagId(pack);

      return !bagId || !keep.has(bagId);
    }, '고아 지도 팩 정리 실패'); // l10n-ignore: 개발자 로그
  }

  // 다 받은(`complete`) 팩의 영역 `[west, south, east, north]`. 받다 만 팩(`inactive`·`active`)은 보지
  // 않는다 — 조용한 갱신이 그 팩을 다시 쓰면 지도에 구멍이 남는다. 팩이 없으면(또는 웹) `null`.
  public static async getBounds(
    bagId: string
  ): Promise<OfflineLngLatBounds | null> {
    if (Platform.OS === 'web') {
      return null;
    }

    try {
      const packs = await requireManager().getPacks();

      for (const pack of packs) {
        if (getPackBagId(pack) !== bagId) {
          continue;
        }

        const status = await pack.status().catch(() => null);
        const bounds: unknown = pack.bounds;

        if (status?.state === 'complete' && isOfflineLngLatBounds(bounds)) {
          return bounds;
        }
      }

      return null;
    } catch (error) {
      console.warn('[OfflineMapPack] 지도 팩 영역 읽기 실패', error); // l10n-ignore: 개발자 로그

      throw error;
    }
  }

  private static async removeMatching(
    predicate: (pack: MapLibreOfflinePack) => boolean,
    logMessage: string
  ): Promise<void> {
    if (Platform.OS === 'web') {
      return;
    }

    try {
      await OfflineMapPack.removeWith(requireManager(), predicate);
    } catch (error) {
      console.warn(`[OfflineMapPack] ${logMessage}`, error); // l10n-ignore: 개발자 로그

      throw error;
    }
  }

  private static async removeWith(
    manager: MapLibreOfflineManager,
    predicate: (pack: MapLibreOfflinePack) => boolean
  ): Promise<void> {
    const packs = await manager.getPacks();
    const targets = packs.filter(predicate);

    for (const pack of targets) {
      manager.removeListener(pack.id);
      await manager.deletePack(pack.id);
    }
  }

  /**
   * 팩 하나를 만들고 `complete`까지 기다린다. 네이티브는 타일 한 장 시간 초과 같은 **일시적 오류**도
   * `onError`로 보내고 받기를 이어 가므로, 타일 수 상한 오류만 치명으로 보고 나머지는 로그만 남긴다.
   * 시간 초과·`signal` 중단이면 거부한다. 끝나면 리스너를 정리한다(받던 팩 삭제는 호출자 몫).
   */
  private static downloadOnce(
    manager: MapLibreOfflineManager,
    request: PackRequest,
    onProgress: (percentage: number) => void,
    onCreated: (packId: string) => void,
    signal: AbortSignal | undefined
  ): Promise<OfflineMapPackResult> {
    return new Promise<OfflineMapPackResult>((resolve, reject) => {
      let packId: string | null = null;
      let settled = false;
      let resolved = false;

      const finish = (callback: () => void) => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timeoutId);
        signal?.removeEventListener('abort', handleAbort);

        if (packId) {
          manager.removeListener(packId);
        }

        callback();
      };

      const fail = (error: unknown) => {
        finish(() => reject(error));
      };

      const handleAbort = () => {
        fail(new OfflineMapPackAbortError());
      };

      const timeoutId = setTimeout(() => {
        fail(new Error('offline pack download timed out'));
      }, PACK_DOWNLOAD_TIMEOUT_MS);

      signal?.addEventListener('abort', handleAbort);

      if (signal?.aborted) {
        handleAbort();

        return;
      }

      manager
        .createPack(
          {
            mapStyle: MAP_STYLE_URL,
            bounds: request.bounds,
            minZoom: PACK_MIN_ZOOM,
            maxZoom: request.maxZoom,
            metadata: {
              bagId: request.bagId,
              ownerId: request.ownerId,
              styleVersion: MAP_STYLE_VERSION,
            },
          },
          (pack, status) => {
            packId = pack.id;
            onCreated(pack.id);

            if (settled) {
              return;
            }

            onProgress(
              Math.max(0, Math.min(100, Number(status.percentage) || 0))
            );

            if (status.state === 'complete') {
              resolved = true;
              finish(() =>
                resolve({
                  bytes: Number(status.completedResourceSize) || 0,
                  packId: pack.id,
                })
              );
            }
          },
          (pack, error) => {
            packId = pack.id;
            onCreated(pack.id);

            if (isTileLimitError(error)) {
              fail(new Error(error.message || 'offline pack tile limit'));

              return;
            }

            // 일시적 오류 — 네이티브가 받기를 이어 간다. `complete`·시간 초과를 기다린다.
            console.warn('[OfflineMapPack] 지도 팩 일시 오류(계속 받음)', error.message); // l10n-ignore: 개발자 로그
          }
        )
        .then(pack => {
          packId = pack.id;
          onCreated(pack.id);

          if (!settled) {
            return;
          }

          // 리스너가 붙기 전에 이미 끝났으면(중단·시간 초과) 여기서 정리한다. 거부된 뒤에 생긴 팩은 호출자의
          // 정리보다 늦게 왔을 수 있으니 직접 지운다.
          manager.removeListener(pack.id);

          if (!resolved) {
            manager.deletePack(pack.id).catch(() => undefined);
          }
        })
        .catch((error: unknown) => {
          fail(error);
        });
    });
  }
}

export default OfflineMapPack;
