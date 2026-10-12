import { NativeModules, TurboModuleRegistry } from 'react-native';

// OF §5: MapLibre(`@maplibre/maplibre-react-native`)는 2.0.3 바이너리에서 들어온 네이티브 모듈이다.
// SDK는 import 시점에 `TurboModuleRegistry.getEnforcing('MLRN...Module')`로 던지므로, 저장 흐름
// (앱 시작 때 실리는 `OfflineTripStore`)과 코스 화면(`OfflineRouteMapGateView`)이 옛 바이너리에서 터지지
// 않게 **쓸 때 처음** 싣고, 네이티브 모듈이 없으면 `null`/`false`를 돌려준다. 웹은 `OfflineMapModule.web.ts`.
//
// **2.0.3 이상 바이너리 전용이다 — 이 코드를 2.0.2 이하 바이너리에 OTA로 보내지 않는다.** 위 방어는 OTA가
// 잘못 나갔을 때 앱이 죽지 않게 하는 안전망일 뿐이다(옛 바이너리에서는 오프라인 지도가 없다).
export type MapLibreOfflineManager =
  (typeof import('@maplibre/maplibre-react-native'))['OfflineManager'];

// MapLibre 네이티브 모듈이 처음 들어온 바이너리 버전(참고용 — 런타임 판정은 모듈 유무로 한다).
export const OFFLINE_MAP_MIN_BINARY_VERSION = '2.0.3';

// SDK가 찾는 네이티브 모듈 이름(`src/modules/offline/NativeOfflineModule.ts`,
// `src/components/map/NativeMapViewModule.ts`). SDK를 올리면 다시 맞춘다.
const OFFLINE_NATIVE_MODULE = 'MLRNOfflineModule';
const MAP_VIEW_NATIVE_MODULE = 'MLRNMapViewModule';

let offlineManager: MapLibreOfflineManager | null | undefined;
let offlineMapAvailable: boolean | undefined;

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

/**
 * 오프라인 지도(MapLibre 지도 뷰)를 그릴 수 있는 바이너리인지. 지도 뷰·오프라인 모듈이 모두 있어야 한다.
 * 결과는 캐시한다(바이너리가 실행 중에 바뀌지 않는다).
 */
export const isOfflineMapAvailable = (): boolean => {
  if (offlineMapAvailable === undefined) {
    offlineMapAvailable =
      hasNativeModule(MAP_VIEW_NATIVE_MODULE) && hasOfflineNativeModule();
  }

  return offlineMapAvailable;
};

export const loadOfflineManager = (): MapLibreOfflineManager | null => {
  if (offlineManager !== undefined) {
    return offlineManager;
  }

  if (!hasOfflineNativeModule()) {
    offlineManager = null;

    return offlineManager;
  }

  try {
    type MapLibreSdk = typeof import('@maplibre/maplibre-react-native');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sdk = require('@maplibre/maplibre-react-native') as MapLibreSdk;

    offlineManager = sdk.OfflineManager;
  } catch {
    offlineManager = null;
  }

  return offlineManager;
};
