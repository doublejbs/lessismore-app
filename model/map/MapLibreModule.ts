import { NativeModules, TurboModuleRegistry } from 'react-native';

// MAP-1 · OF §5: MapLibre(`@maplibre/maplibre-react-native`)는 2.0.2 재빌드(TestFlight 빌드 112 이후)에서 들어온
// 네이티브 모듈이다. SDK는 import 시점에 `TurboModuleRegistry.getEnforcing('MLRN...Module')`로 던지므로, 앱 시작 때
// 실리는 모델(`OfflineTripStore`·정적 썸네일)과 지도 화면 게이트가 옛 바이너리에서 터지지 않게 **쓸 때 처음**
// 싣고, 네이티브 모듈이 없으면 `null`/`false`를 돌려준다. 웹은 `MapLibreModule.web.ts`.
//
// **MapLibre가 들어간 바이너리 전용이다 — MapLibre 없이 구운 2.0.2 TestFlight 빌드 111·2.0.1 이하에 OTA로 보내지
// 않는다.** 위 방어는 OTA가 잘못 나갔을 때 앱이 죽지 않게 하는 안전망일 뿐이다(옛 바이너리에서는 지도가 없다).
type MapLibreSdk = typeof import('@maplibre/maplibre-react-native');

export type MapLibreOfflineManager = MapLibreSdk['OfflineManager'];
export type MapLibreStaticMapImageManager = MapLibreSdk['StaticMapImageManager'];

// MapLibre 네이티브 모듈이 처음 들어온 바이너리 버전(참고용 — 런타임 판정은 모듈 유무로 한다).
export const MAP_LIBRE_MIN_BINARY_VERSION = '2.0.2';

// SDK가 찾는 네이티브 모듈 이름(`src/modules/offline/NativeOfflineModule.ts`,
// `src/components/map/NativeMapViewModule.ts`, `src/modules/static-map/NativeStaticMapModule.ts`).
// SDK를 올리면 다시 맞춘다.
const OFFLINE_NATIVE_MODULE = 'MLRNOfflineModule';
const MAP_VIEW_NATIVE_MODULE = 'MLRNMapViewModule';
const STATIC_MAP_NATIVE_MODULE = 'MLRNStaticMapModule';

let offlineManager: MapLibreOfflineManager | null | undefined;
let staticMapImageManager: MapLibreStaticMapImageManager | null | undefined;
let mapLibreAvailable: boolean | undefined;

// `get`(enforcing 아님)으로 찾는다 — 없으면 던지지 않고 `null`이다.
const hasNativeModule = (name: string): boolean => {
  try {
    return TurboModuleRegistry.get(name) != null || NativeModules[name] != null;
  } catch {
    return false;
  }
};

const hasOfflineNativeModule = (): boolean =>
  hasNativeModule(OFFLINE_NATIVE_MODULE);

const requireSdk = (): MapLibreSdk | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@maplibre/maplibre-react-native') as MapLibreSdk;
  } catch {
    return null;
  }
};

/**
 * MapLibre 지도를 그릴 수 있는 바이너리인지 — **앱의 모든 지도 화면이 쓰는 판정이다**(MAP-1: 박지 지도·선택기·
 * 배낭 코스·그룹 지도·밴드·운동 기록, 오프라인 코스 지도). 지도 뷰·오프라인 모듈이 모두 있어야 한다(같은
 * 바이너리에 함께 들어온다). 결과는 캐시한다(바이너리가 실행 중에 바뀌지 않는다).
 */
export const isMapLibreAvailable = (): boolean => {
  if (mapLibreAvailable === undefined) {
    mapLibreAvailable =
      hasNativeModule(MAP_VIEW_NATIVE_MODULE) && hasOfflineNativeModule();
  }

  return mapLibreAvailable;
};

export const loadOfflineManager = (): MapLibreOfflineManager | null => {
  if (offlineManager !== undefined) {
    return offlineManager;
  }

  if (!hasOfflineNativeModule()) {
    offlineManager = null;

    return offlineManager;
  }

  offlineManager = requireSdk()?.OfflineManager ?? null;

  return offlineManager;
};

// 정적 지도 이미지(MAP-3)를 만드는 SDK 매니저. 정적 지도 네이티브 모듈이 없으면 `null`.
export const loadStaticMapImageManager =
  (): MapLibreStaticMapImageManager | null => {
    if (staticMapImageManager !== undefined) {
      return staticMapImageManager;
    }

    if (
      !isMapLibreAvailable() ||
      !hasNativeModule(STATIC_MAP_NATIVE_MODULE)
    ) {
      staticMapImageManager = null;

      return staticMapImageManager;
    }

    staticMapImageManager = requireSdk()?.StaticMapImageManager ?? null;

    return staticMapImageManager;
  };
