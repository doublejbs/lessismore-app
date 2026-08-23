import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import { StyleSheet, View } from 'react-native';
import {
  NaverMapMarkerOverlay,
  NaverMapPathOverlay,
  NaverMapView,
} from '@mj-studio/react-native-naver-map';
import { Color, Radius } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import {
  HealthRoutePoint,
  HealthWorkoutRoute,
} from '@/model/health/HealthTypes';

interface Props {
  routes: HealthWorkoutRoute[];
}

/** 폴리라인 색. 데이터 시각화 색이라 토큰 예외로 하드코딩한다(CLAUDE.md). */
const ROUTE_COLOR = '#2F6BFF';
const ROUTE_OUTLINE_COLOR = '#FFFFFF';
const ROUTE_WIDTH = 5;
const ROUTE_OUTLINE_WIDTH = 2;

/** 시작/종료 마커 색. */
const START_MARKER_COLOR = '#22C55E';
const END_MARKER_COLOR = '#EF4444';
const MARKER_SIZE = 16;

/** 경로선은 좌표가 2개 미만이면 지도에 추가되지 않는다(라이브러리 제약). */
const MIN_PATH_COORDS = 2;

/** 경로가 화면 가장자리에 붙지 않도록 bounding box에 주는 여유 배율. */
const CAMERA_PADDING_RATIO = 1.3;

/**
 * 최소 표시 범위(도). 한 자리에서 맴돈 기록은 bounding box가 0에 가까워
 * 그대로 쓰면 최대 줌으로 붙어 버린다. 약 100m 스팬으로 하한을 둔다.
 */
const MIN_REGION_DELTA = 0.001;

const toCoords = (points: HealthRoutePoint[]) => {
  // 네이티브로 넘길 땐 좌표만 남긴다 — timestamp·altitude는 오버레이가 쓰지 않는다.
  return points.map(point => ({
    latitude: point.latitude,
    longitude: point.longitude,
  }));
};

/**
 * 모든 경로를 담는 카메라 영역. `initialRegion`은 south-west 좌표 + 위경도 스팬을
 * 받으므로 전체 좌표의 bounding box를 그대로 넘기면 라이브러리가 줌을 맞춘다.
 */
const getRegion = (points: HealthRoutePoint[]) => {
  const latitudes = points.map(point => point.latitude);
  const longitudes = points.map(point => point.longitude);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);
  const latitudeDelta = Math.max(
    (maxLatitude - minLatitude) * CAMERA_PADDING_RATIO,
    MIN_REGION_DELTA
  );
  const longitudeDelta = Math.max(
    (maxLongitude - minLongitude) * CAMERA_PADDING_RATIO,
    MIN_REGION_DELTA
  );

  return {
    // 여유 배율만큼 넓힌 만큼 south-west 모서리도 같이 밀어 중심을 유지한다.
    latitude: (minLatitude + maxLatitude) / 2 - latitudeDelta / 2,
    longitude: (minLongitude + maxLongitude) / 2 - longitudeDelta / 2,
    latitudeDelta,
    longitudeDelta,
  };
};

// 연결된 운동의 GPS 경로 지도(HA-4). 복수 연결이면 경로를 각각 그리고
// 카메라는 전체를 담는다. 경로가 없는 기록은 상위에서 이 컴포넌트를 렌더하지 않는다.
//
// 스크롤 뷰 안에 놓이므로 제스처는 모두 막는다 — 지도 조작이 목적이 아니라
// "어디를 걸었는지" 확인이 목적이고, 팬 제스처가 스크롤과 충돌하면 화면이 갇힌다.
const BagActivityRouteMapView: FC<Props> = ({ routes }) => {
  const drawable = routes.filter(
    route => route.points.length >= MIN_PATH_COORDS
  );

  if (drawable.length === 0) {
    return null;
  }

  const allPoints = drawable.flatMap(route => route.points);

  return (
    <View
      style={styles.container}
      accessible
      accessibilityLabel={app.getL10n().t('health.routeMapAccessibility', {
        count: drawable.length,
      })}
    >
      <NaverMapView
        style={StyleSheet.absoluteFill}
        initialRegion={getRegion(allPoints)}
        isShowLocationButton={false}
        isShowZoomControls={false}
        isShowScaleBar={false}
        isShowCompass={false}
        isScrollGesturesEnabled={false}
        isZoomGesturesEnabled={false}
        isTiltGesturesEnabled={false}
        isRotateGesturesEnabled={false}
        isStopGesturesEnabled={false}
      >
        {drawable.map(route => (
          <NaverMapPathOverlay
            key={route.workoutId}
            coords={toCoords(route.points)}
            width={ROUTE_WIDTH}
            color={ROUTE_COLOR}
            outlineWidth={ROUTE_OUTLINE_WIDTH}
            outlineColor={ROUTE_OUTLINE_COLOR}
          />
        ))}
        {drawable.map(route => {
          const start = route.points[0];
          const end = route.points[route.points.length - 1];

          return [
            <NaverMapMarkerOverlay
              key={`${route.workoutId}-start`}
              latitude={start.latitude}
              longitude={start.longitude}
              anchor={{ x: 0.5, y: 0.5 }}
              width={MARKER_SIZE}
              height={MARKER_SIZE}
            >
              {/* 커스텀 View 마커는 최상위 자식에 collapsable=false를 줘야 렌더가 보장된다(라이브러리 요구). */}
              <View
                key={START_MARKER_COLOR}
                collapsable={false}
                style={[styles.marker, { backgroundColor: START_MARKER_COLOR }]}
              />
            </NaverMapMarkerOverlay>,
            <NaverMapMarkerOverlay
              key={`${route.workoutId}-end`}
              latitude={end.latitude}
              longitude={end.longitude}
              anchor={{ x: 0.5, y: 0.5 }}
              width={MARKER_SIZE}
              height={MARKER_SIZE}
            >
              <View
                key={END_MARKER_COLOR}
                collapsable={false}
                style={[styles.marker, { backgroundColor: END_MARKER_COLOR }]}
              />
            </NaverMapMarkerOverlay>,
          ];
        })}
      </NaverMapView>
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
