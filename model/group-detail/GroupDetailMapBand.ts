import { CampSpot } from '@/model/camp-site/CampSpotTypes';
import GroupPoint from '@/model/group/GroupPoint';
import { RouteBounds } from '@/model/route/RouteData';
import { RouteDisplay } from '@/model/route/RouteDisplay';
import {
  measureRouteBounds,
  mergeRouteBounds,
} from '@/model/route/RouteCamera';

/**
 * 그룹 상세 상단 지도 밴드의 판정·카메라 (GRP-7).
 *
 * 밴드는 그룹 지도(`GroupMap.getContentBounds`)와 **같은 계산**으로 상자를 잡는다 — 코스·포인트
 * 상자를 합치고, 밴드는 박지도 함께 담는다(스펙: "카메라는 코스·포인트·박지를 모두 담는다").
 */

// 코스·포인트만의 상자. 이것이 있으면 코스 지도 밴드, 없으면 박지 정적 밴드로 내려간다.
export const getGroupContentBounds = (
  routes: readonly RouteDisplay[],
  points: readonly GroupPoint[]
): RouteBounds | null => {
  return mergeRouteBounds([
    ...routes.map(route => route.getBounds()),
    measureRouteBounds(
      points.map(point => ({
        lat: point.getLatitude(),
        lng: point.getLongitude(),
      }))
    ),
  ]);
};

// 밴드 카메라 상자 — 코스·포인트 상자에 박지 좌표를 더한다. 코스·포인트가 없으면 `null`이다.
export const getGroupMapBandBounds = (
  routes: readonly RouteDisplay[],
  points: readonly GroupPoint[],
  campSpot: CampSpot | null
): RouteBounds | null => {
  const contentBounds = getGroupContentBounds(routes, points);

  if (!contentBounds) {
    return null;
  }

  if (!campSpot) {
    return contentBounds;
  }

  return mergeRouteBounds([
    contentBounds,
    measureRouteBounds([
      { lat: campSpot.location.latitude, lng: campSpot.location.longitude },
    ]),
  ]);
};
