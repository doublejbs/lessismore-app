import {
  OfflineManager,
  StaticMapImageManager,
} from '@maplibre/maplibre-react-native';

/**
 * MapLibre SDK의 매니저 객체를 **정적 import 한 모듈 인스턴스에서** 꺼내 준다 (MAP-1).
 *
 * `MapLibreModule.ts`가 SDK를 지연 로드할 때 패키지를 직접 `require('@maplibre/maplibre-react-native')`
 * 하면 안 된다 — 패키지 `exports`가 `import`(ESM 빌드)와 `require`(CommonJS 빌드) 조건을 따로 두어
 * Metro가 **두 번째 사본**을 싣고, 그 사본이 네이티브 뷰를 다시 등록하면서
 * `Tried to register two views with the same name MLRNCamera`로 앱이 죽는다(2026-10-12 시뮬레이터 실측).
 * 이 파일은 지도 뷰(`AppMapView`)와 같은 `import` 조건으로 SDK를 가져오므로, 지연 로더가 이 파일을
 * `require('./MapLibreSdk')`로 실으면 사본이 생기지 않는다. 함수로 감싼 것은 re-export 금지 규칙 때문이다.
 */
export const getOfflineManager = () => OfflineManager;

export const getStaticMapImageManager = () => StaticMapImageManager;
