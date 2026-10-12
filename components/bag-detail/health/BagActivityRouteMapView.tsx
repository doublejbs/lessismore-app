import { FC, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { StyleSheet, View } from 'react-native';
import { Marker } from '@maplibre/maplibre-react-native';
import AppMapView, { AppMapInitialCamera } from '@/components/map/AppMapView';
import MapHealthRouteLayersView, {
  MapHealthRouteLine,
} from '@/components/map/MapHealthRouteLayersView';
import { Color, Radius } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import { HealthWorkoutRoute } from '@/model/health/HealthTypes';
import {
  lngLatBoundsToRouteBounds,
  regionToLngLatBounds,
} from '@/model/map/MapCamera';
import { sampleRouteCoordinates } from '@/model/route-replay/RouteReplayCoordinates';
import { getRouteFitRegion, measureRouteBounds } from '@/model/route/RouteCamera';
import { RouteCoordinate } from '@/model/route/RouteData';

interface Props {
  routes: HealthWorkoutRoute[];
}

/** 시작/종료 마커 색. */
const START_MARKER_COLOR = '#22C55E';
const END_MARKER_COLOR = '#EF4444';
const MARKER_SIZE = 16;

/** 경로선은 좌표가 2개 미만이면 그리지 않는다. */
const MIN_PATH_COORDS = 2;

/**
 * 최소 표시 범위(도). 한 자리에서 맴돈 기록은 상자가 0에 가까워 그대로 쓰면 최대 줌으로 붙어 버린다.
 * 약 100m 스팬으로 하한을 둔다 — 코스 지도(0.004°)보다 작다: 운동 기록은 걸은 자리를 가까이 보는 것이 목적이다.
 */
const MIN_REGION_DELTA = 0.001;

interface DrawableRoute {
  id: string;
  // 지도에 그릴 좌표(긴 기록은 균등 샘플링으로 줄였다). 첫 점·끝 점은 원본 그대로다.
  coordinates: RouteCoordinate[];
}

// 수천 점짜리 기록은 3D 리플레이와 같은 500점 균등 샘플링으로 줄인다(선 렌더·GeoJSON 직렬화 비용).
const toDrawableRoutes = (routes: HealthWorkoutRoute[]): DrawableRoute[] =>
  routes
    .filter(route => route.points.length >= MIN_PATH_COORDS)
    .map(route => ({
      id: route.workoutId,
      coordinates: sampleRouteCoordinates(
        route.points.map(point => ({
          lat: point.latitude,
          lng: point.longitude,
        }))
      ),
    }));

const getInitialCamera = (
  drawable: DrawableRoute[]
): AppMapInitialCamera | null => {
  const bounds = measureRouteBounds(
    drawable.flatMap(route => route.coordinates)
  );

  if (!bounds) {
    return null;
  }

  return {
    bounds: lngLatBoundsToRouteBounds(
      regionToLngLatBounds(getRouteFitRegion(bounds, MIN_REGION_DELTA))
    ),
    padding: 0,
  };
};

// 연결된 운동의 GPS 경로 지도(HA-4 · MAP-4). 복수 연결이면 경로를 각각 그리고 카메라는 전체를 담는다.
// 경로가 없는 기록은 상위에서 이 컴포넌트를 렌더하지 않는다.
//
// 스크롤 뷰 안에 놓이므로 제스처는 모두 막는다(`interactive={false}`) — 지도 조작이 목적이 아니라
// "어디를 걸었는지" 확인이 목적이고, 팬 제스처가 스크롤과 충돌하면 화면이 갇힌다.
const BagActivityRouteMapView: FC<Props> = ({ routes }) => {
  const drawable = useMemo(() => toDrawableRoutes(routes), [routes]);
  const lines = useMemo(
    (): MapHealthRouteLine[] =>
      drawable.map(route => ({
        id: route.id,
        coordinates: route.coordinates.map(
          (coordinate): [number, number] => [coordinate.lng, coordinate.lat]
        ),
      })),
    [drawable]
  );
  // 지도를 붙일 때 한 번 정한다 — 연결된 운동은 이 화면 안에서 바뀌지 않는다.
  const [initialCamera] = useState(() => getInitialCamera(drawable));

  if (drawable.length === 0) {
    return null;
  }

  return (
    <View
      style={styles.container}
      accessible
      accessibilityLabel={app.getL10n().t('health.routeMapAccessibility', {
        count: drawable.length,
      })}
    >
      <AppMapView
        style={StyleSheet.absoluteFill}
        {...(initialCamera ? { initialCamera } : {})}
        interactive={false}
        showCompass={false}
      >
        <MapHealthRouteLayersView lines={lines} />
        {drawable.flatMap(route => {
          const start = route.coordinates[0];
          const end = route.coordinates[route.coordinates.length - 1];

          return [
            <Marker
              key={`${route.id}-start`}
              id={`activity-route-${route.id}-start`}
              lngLat={[start.lng, start.lat]}
              anchor='center'
            >
              <View
                collapsable={false}
                pointerEvents='none'
                style={[styles.marker, { backgroundColor: START_MARKER_COLOR }]}
              />
            </Marker>,
            <Marker
              key={`${route.id}-end`}
              id={`activity-route-${route.id}-end`}
              lngLat={[end.lng, end.lat]}
              anchor='center'
            >
              <View
                collapsable={false}
                pointerEvents='none'
                style={[styles.marker, { backgroundColor: END_MARKER_COLOR }]}
              />
            </Marker>,
          ];
        })}
      </AppMapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 220,
    borderRadius: Radius.card,
    overflow: 'hidden',
    backgroundColor: Color.thumbBg,
  },
  marker: {
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    borderRadius: MARKER_SIZE / 2,
    borderWidth: 2,
    borderColor: Color.background,
  },
});

export default observer(BagActivityRouteMapView);
