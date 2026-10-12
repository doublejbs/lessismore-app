import { FC } from 'react';

/**
 * 웹 대체 (GRP-10 · APP-5) — 웹에는 지도가 없다(`GroupMapView`는 웹에서 목록을 그린다). 화면의 지연 로더
 * `require`가 웹 번들에 MapLibre 네이티브 모듈을 끌어오지 않도록 플랫폼 확장자로 갈라 둔다.
 */
const GroupMapCanvasView: FC<object> = () => {
  return null;
};

export default GroupMapCanvasView;
