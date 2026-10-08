import { useMemo } from 'react';
import { RouteElevationPointMarker } from '@/components/route/RouteElevationChartView';
import app from '@/model/app/App';
import GroupPoint from '@/model/group/GroupPoint';
import { getGroupPointTypeColor } from '@/model/group-point/GroupPointLabels';
import { RouteDisplay } from '@/model/route/RouteDisplay';
import { formatRouteDistance } from '@/model/route/RouteFormat';
import {
  projectPointOntoRoute,
  ROUTE_PROJECTION_MAX_OFFSET_METERS,
} from '@/model/route/RouteProjection';

interface GroupPointRouteMark {
  // 고도 그래프에 찍을 표시. 고도가 없는 코스면 `null`이다(그래프 자체가 없다).
  chartMarker: RouteElevationPointMarker | null;
  // 포인트 카드 메타에 덧붙일 줄 — `코스 12.3km 지점 · 고도 1,234m`.
  calloutMeta: string;
}

/**
 * 고른 포인트가 선택된 코스의 어디쯤인지 (GRP-8 포인트 → 고도 그래프 표시).
 *
 * 코스 좌표는 **지금 보는 방향**(`getSimplified()`)을 쓴다 — 그래프 단면·훑기 마커와 같은 출처라
 * 뒤집은 코스에서도 거리가 새 출발점부터 읽힌다. 코스에서 500m보다 멀면 `null`이다(카드는 그대로
 * 뜨고 코스 줄만 빠진다). 포인트나 코스가 없어도 `null`이다.
 *
 * 거리는 목록 행·그래프 축과 같은 **원본 트랙 거리**로 환산해 적는다 — 축약 좌표로 잰 거리를
 * 그대로 쓰면 같은 코스의 끝이 `31.5km`와 `31.0km`로 둘이 된다(`RouteElevationChartView`).
 */
const useGroupPointRouteMark = (
  route: RouteDisplay | null,
  point: GroupPoint | null
): GroupPointRouteMark | null => {
  const l10n = app.getL10n();
  const language = l10n.language;
  // MobX 값이다 — 뒤집으면 다시 잰다.
  const reversed = route?.isReversed() ?? false;

  return useMemo(() => {
    if (!route || !point) {
      return null;
    }

    const projection = projectPointOntoRoute(
      route.getSimplified(),
      point.getLatitude(),
      point.getLongitude()
    );

    if (!projection || projection.offset > ROUTE_PROJECTION_MAX_OFFSET_METERS) {
      return null;
    }

    const separator = l10n.t('common.metaSeparator');
    const displayTotal = route.getDistance();
    const scale =
      projection.totalDistance > 0
        ? displayTotal / projection.totalDistance
        : 1;
    const distanceText = formatRouteDistance(
      projection.distanceAlong * scale,
      displayTotal
    );
    const elevationText =
      projection.elevation !== null
        ? l10n.t('route.pointElevation', {
            value: Math.round(projection.elevation).toLocaleString(language),
          })
        : null;
    const withElevation = (head: string) =>
      elevationText ? `${head}${separator}${elevationText}` : head;
    const profile = route.getElevationProfile();
    const chartMarker =
      profile &&
      projection.profileDistance !== null &&
      projection.elevation !== null
        ? {
            distance: Math.min(
              profile.totalDistance,
              Math.max(0, projection.profileDistance)
            ),
            elevation: projection.elevation,
            color: getGroupPointTypeColor(point.getType()),
            label: withElevation(
              `${point.getTitle()}${separator}${distanceText}`
            ),
          }
        : null;

    return {
      chartMarker,
      calloutMeta: withElevation(
        l10n.t('route.pointOnRoute', { distance: distanceText })
      ),
    };
    // `reversed`는 `getSimplified()`·`getElevationProfile()`의 방향을 바꾸는 MobX 값이라 의존성에 둔다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, point, reversed, language, l10n]);
};

export default useGroupPointRouteMark;
