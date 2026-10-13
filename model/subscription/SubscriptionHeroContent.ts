import MapPoint from '@/model/point/MapPoint';
import {
  measureRouteBounds,
  mergeRouteBounds,
} from '@/model/route/RouteCamera';
import { RouteBounds } from '@/model/route/RouteData';
import { RouteDisplay } from '@/model/route/RouteDisplay';
import { SubscriptionHeroCoordinate } from './SubscriptionHeroLocation';

// 지도에 선으로 그릴 수 있는 코스의 최소 좌표 수(`MapRoutePathLayersView`와 같은 값).
const MIN_ROUTE_COORDS = 2;

/**
 * SUB-2 ① 히어로가 그릴 것 — 지도 중심 + 다가오는 여행의 실제 코스·포인트.
 *
 * `routes`가 비면 **예시 코스**(여행지 중심 줌 12 + SVG 일러스트)다. 코스가 없는 여행, 다가오는 여행 없음,
 * 비로그인, 조회 실패·시간 초과가 모두 여기로 모인다. 포인트는 실제 코스가 있을 때만 싣는다.
 */
export interface SubscriptionHeroContent {
  coordinate: SubscriptionHeroCoordinate;
  routes: readonly RouteDisplay[];
  points: readonly MapPoint[];
  // 코스 화면에서 사용자가 고른 내 코스 id(BD-11 선택 기억). 없으면 `null` — 내 첫 코스에 말풍선을 단다.
  selectedRouteId: string | null;
}

export const toHeroContent = (
  coordinate: SubscriptionHeroCoordinate,
  routes: readonly RouteDisplay[],
  points: readonly MapPoint[],
  selectedRouteId: string | null = null
): SubscriptionHeroContent => {
  const drawableRoutes = routes.filter(
    route => route.getSimplified().length >= MIN_ROUTE_COORDS
  );

  if (drawableRoutes.length === 0) {
    return { coordinate, routes: [], points: [], selectedRouteId: null };
  }

  return { coordinate, routes: drawableRoutes, points, selectedRouteId };
};

export const hasHeroRealRoute = (content: SubscriptionHeroContent): boolean =>
  content.routes.length > 0;

/**
 * 출발·도착 말풍선을 달 코스 하나 — 코스 화면에서 **기억된 선택**(BD-11), 없거나 그려지지 않으면 내 첫 코스.
 * 여러 코스 모두에 달면 코스 수 × 2개의 말풍선이 히어로를 덮는다(그룹 밴드 GRP-7과 같은 이유).
 * 선은 모두 같은 굵기로 그린다.
 */
export const getHeroEndpointRoute = (
  content: SubscriptionHeroContent
): RouteDisplay | null =>
  content.routes.find(route => route.getId() === content.selectedRouteId) ??
  content.routes[0] ??
  null;

// 카메라 상자 — 코스·포인트를 모두 담는다(코스 화면 `BagRouteList`·`BagPointList` 상자와 같은 합치기).
export const getHeroContentBounds = (
  content: SubscriptionHeroContent
): RouteBounds | null =>
  mergeRouteBounds([
    ...content.routes.map(route => route.getBounds()),
    measureRouteBounds(
      content.points.map(point => ({
        lat: point.getLatitude(),
        lng: point.getLongitude(),
      }))
    ),
  ]);
