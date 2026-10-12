import type { MapLibreOfflineManager } from './OfflineMapModule';

// OF §5: 웹에는 오프라인 지도가 없다 — MapLibre SDK를 번들에 싣지 않는다.
export const OFFLINE_MAP_MIN_BINARY_VERSION = '2.0.3';

export const isOfflineMapAvailable = (): boolean => {
  return false;
};

export const loadOfflineManager = (): MapLibreOfflineManager | null => {
  return null;
};
