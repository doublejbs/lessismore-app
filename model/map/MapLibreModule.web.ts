import type {
  MapLibreOfflineManager,
  MapLibreStaticMapImageManager,
} from './MapLibreModule';

// MAP-1 · APP-5: 웹에는 지도가 없다 — MapLibre SDK를 번들에 싣지 않는다.
export const MAP_LIBRE_MIN_BINARY_VERSION = '2.0.2';

export const isMapLibreAvailable = (): boolean => {
  return false;
};

export const loadOfflineManager = (): MapLibreOfflineManager | null => {
  return null;
};

export const loadStaticMapImageManager =
  (): MapLibreStaticMapImageManager | null => {
    return null;
  };
