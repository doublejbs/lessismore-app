import { isMapLibreAvailable } from '@/model/map/MapLibreModule';

/**
 * MapLibre 지도 뷰 모듈을 **처음 쓸 때** 싣는 로더 (MAP-1 · OF §5).
 *
 * 지도 본문 컴포넌트(`AppMapView`·`CampSiteSpotsLayerView`·`MapMyLocationMarkerView`를 import하는 파일)는
 * SDK를 최상위에서 import하고, SDK는 import 시점에 네이티브 모듈을 `getEnforcing`으로 찾아 던진다. 그래서
 * 화면은 그 파일을 정적 import하지 않고 이 로더로 싣는다 — 옛 바이너리(MapLibre 없음)면 `null`을 돌려주고
 * 화면은 지도 자리에 `map.unsupportedBinary` 한 줄을 둔다. `load`는 정적 `require('./X')`여야 한다(Metro가
 * 경로를 정적으로 읽는다). 결과는 캐시한다 — 렌더마다 같은 참조라 지도 상태가 초기화되지 않는다.
 */
export const createMapLibreViewLoader = <T>(
  name: string,
  load: () => T
): (() => T | null) => {
  let cached: T | null | undefined;

  return () => {
    if (cached !== undefined) {
      return cached;
    }

    if (!isMapLibreAvailable()) {
      cached = null;

      return cached;
    }

    try {
      cached = load();
    } catch (error) {
      console.warn(`[MapLibreViewLoader] ${name} 싣기 실패`, error); // l10n-ignore: 개발자 로그
      cached = null;
    }

    return cached;
  };
};
