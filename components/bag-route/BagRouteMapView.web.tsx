import { FC } from 'react';

/**
 * 웹 대체 (BD-11 · APP-5) — 웹에는 지도가 없다. `BagRouteView`는 웹에서 이 뷰를 렌더하지 않지만(목록·그래프만),
 * 게이트(`BagRouteMapGateView`)의 `require`가 웹 번들에 MapLibre 네이티브 모듈을 끌어오지 않도록 플랫폼
 * 확장자로 갈라 둔다. 타입은 네이티브 `BagRouteMapView.tsx`에서 온다.
 */
const BagRouteMapView: FC<object> = () => {
  return null;
};

export default BagRouteMapView;
