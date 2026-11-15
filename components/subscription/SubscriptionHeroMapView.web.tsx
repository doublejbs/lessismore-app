import { FC } from 'react';

/**
 * 웹 대체 (SUB-2 · APP-5) — 웹에는 지도가 없다. 히어로의 지연 로더 `require`가 웹 번들에 MapLibre 네이티브
 * 모듈을 끌어오지 않도록 플랫폼 확장자로 갈라 둔다(웹은 구독 화면 자체를 두지 않는다 — SUB §5).
 */
const SubscriptionHeroMapView: FC<object> = () => {
  return null;
};

export default SubscriptionHeroMapView;
