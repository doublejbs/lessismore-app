import { ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

/**
 * 웹 대체 (MAP-2 · APP-5) — 웹에는 지도가 없다. 웹 번들이 MapLibre 네이티브 모듈을 끌어오지 않도록
 * 플랫폼 확장자로 갈라 둔다. 타입은 네이티브 `AppMapView.tsx`에서 import한다(TS는 `.tsx`를 해석한다).
 */
const AppMapView = (_props: Props) => {
  return null;
};

export default AppMapView;
