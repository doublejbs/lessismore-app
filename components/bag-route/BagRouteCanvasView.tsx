import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Camera,
  NaverMapView,
  NaverMapViewRef,
} from '@mj-studio/react-native-naver-map';
import { observer } from 'mobx-react-lite';
import RouteElevationChartView from '@/components/route/RouteElevationChartView';
import RoutePathOverlayView from '@/components/route/RoutePathOverlayView';
import RouteScrubMarkerView from '@/components/route/RouteScrubMarkerView';
import RouteEndpointMarkersView from '@/components/route/RouteEndpointMarkersView';
import MapControlButtonView from '@/components/map/MapControlButtonView';
import MapMyLocationMarkerView from '@/components/map/MapMyLocationMarkerView';
import { Acg } from '@/constants/DesignTokens';
import {
  MapCoordinate,
  useMapCurrentLocation,
} from '@/hooks/useMapCurrentLocation';
import app from '@/model/app/App';
import BagRouteList from '@/model/bag-route/BagRouteList';
import { deltaToZoom } from '@/model/map/MapZoom';
import { getRouteFitRegion } from '@/model/route/RouteCamera';
import { RouteBounds } from '@/model/route/RouteData';
import { RouteElevationSample } from '@/model/route/RouteElevation';

interface Props {
  bagRouteList: BagRouteList;
}

/** 남한 전역이 보이는 폴백 카메라(코스가 하나도 없을 때). */
const KOREA_CAMERA: Camera = {
  latitude: 36.2,
  longitude: 127.9,
  zoom: deltaToZoom(4.8),
};

/** `내 위치`로 옮길 때의 표시 범위(도) — 그룹 지도의 현재 위치 버튼과 같은 값. */
const CURRENT_LOCATION_DELTA = 0.05;

/**
 * 지도 컨트롤이 지도 아래 가장자리에서 떨어지는 거리. 이 화면은 지도 위 아래쪽에 알약·칩이 없어
 * (그래프·목록·`코스 추가`는 지도 **밖** 아래에 있다) 그룹 지도의 +120 대신 이 여백만 둔다.
 */
const CONTROL_BOTTOM_OFFSET = 16;

/**
 * 배낭 코스 지도 (BD-11) — 네이티브 전용 본문.
 *
 * 폴리라인·훑기 마커·고도 그래프는 그룹 지도(GRP-8·GRP-10)와 **같은 컴포넌트**를 쓴다.
 * 여기에는 그룹 지도의 포인트·박지·조준 모드가 없다 — 배낭 코스 화면이 답하는 질문은
 * "이 배낭으로 어디를 걷는가" 하나다.
 *
 * 그래프는 지도 **아래**다. 지도 위에 얹으면 훑는 동안 손가락과 그래프가 지도를 가려
 * "이 오르막이 어디인가"를 볼 수 없다 — 이 기능이 존재하는 이유가 사라진다(GRP-8).
 */
const BagRouteCanvasView: FC<Props> = ({ bagRouteList }) => {
  const mapRef = useRef<NaverMapViewRef>(null);
  const mapReadyRef = useRef(false);
  const didFitRef = useRef(false);
  // 처리한 마지막 코스 선택 요청(`BagRouteList.focusEntry`)의 `seq`.
  const handledFocusSeqRef = useRef(0);
  // 지금 손가락이 고도 그래프 위에 있는지. 이때는 선택이 바뀌어도 카메라를 옮기지 않는다(GRP-8).
  const scrubbingRef = useRef(false);
  const mountedRef = useRef(true);
  /**
   * 고도 그래프에서 훑고 있는 지점. 손을 떼면 `null`이 되어 마커가 사라진다.
   * **어느 코스의 지점인지 함께 들고 있는다** — 코스를 바꾸면 그래프는 새로 마운트되지만
   * 손을 뗐다고 알려 줄 길이 없어, 태그가 없으면 지난 코스의 마커가 지도에 남는다.
   */
  const [scrub, setScrub] = useState<{
    key: string;
    sample: RouteElevationSample;
  } | null>(null);
  const entries = bagRouteList.getEntries();
  const routes = entries.map(entry => entry.route);
  const selected = bagRouteList.getSelectedEntry();
  const selectedKey = bagRouteList.getSelectedKey();
  const selectedRoute = selected?.route ?? null;
  const focusRequest = bagRouteList.getFocusRequest();

  /**
   * 내 위치 (BD-11) — 그룹 지도·박지 지도와 같은 공용 훅이다. 진입에서 권한을 묻지 않고,
   * 권한이 없으면 점을 그리지 않는다. 버튼은 항상 보이고 누르면 권한을 요청한다 — 코스를 따라
   * 걸으며 "지금 어디쯤인가"를 보려고 들어온 화면이라 첫 요청 자리가 필요하다.
   */
  const moveToCoordinate = useCallback((coordinate: MapCoordinate) => {
    if (!mountedRef.current || !mapReadyRef.current) {
      return;
    }

    // 사용자가 직접 옮겼으므로 늦게 온 데이터가 최초 맞춤으로 카메라를 되돌리지 않게 한다.
    didFitRef.current = true;
    mapRef.current?.animateRegionTo({
      latitude: coordinate.latitude - CURRENT_LOCATION_DELTA / 2,
      longitude: coordinate.longitude - CURRENT_LOCATION_DELTA / 2,
      latitudeDelta: CURRENT_LOCATION_DELTA,
      longitudeDelta: CURRENT_LOCATION_DELTA,
      duration: 500,
    });
  }, []);
  const { currentLocation, moveToCurrentLocation } = useMapCurrentLocation({
    moveCamera: moveToCoordinate,
    logTag: 'BagRoute',
  });

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      mapReadyRef.current = false;
    };
  }, []);

  const fitBounds = useCallback((bounds: RouteBounds) => {
    mapRef.current?.animateRegionTo({
      ...getRouteFitRegion(bounds),
      duration: 500,
    });
  }, []);

  // 최초 카메라 — 목록의 코스를 모두 담는 상자에 맞춘다(BD-11). 코스가 없으면 그대로 둔다.
  const fitInitialCamera = useCallback(() => {
    if (didFitRef.current || !mapReadyRef.current) {
      return;
    }

    const bounds = bagRouteList.getContentBounds();

    if (!bounds) {
      return;
    }

    didFitRef.current = true;
    fitBounds(bounds);
  }, [bagRouteList, fitBounds]);

  /**
   * 목록에서 고른 코스로 카메라를 옮긴다(BD-11). 최초 맞춤과 달리 **고를 때마다** 옮긴다 —
   * 같은 코스를 다시 골라도(`seq`가 올라간다). 지도가 아직 준비되지 않았으면 요청을 남겨 두고
   * 준비된 뒤 한 번 맞춘다. 요청을 처리했으면 `true`다.
   */
  const fitFocusedRoute = useCallback(() => {
    const request = bagRouteList.getFocusRequest();

    if (
      !request ||
      request.seq === handledFocusSeqRef.current ||
      !mapReadyRef.current
    ) {
      return false;
    }

    handledFocusSeqRef.current = request.seq;

    // 훑는 중에 바뀐 선택은 카메라를 옮기지 않는다 — 손가락 아래 그래프와 지도가 어긋난다(GRP-8).
    // 선택이 바뀌면 그래프가 새로 마운트되어 이 훑기는 끝난다(남은 마커는 키가 달라 저절로 걷힌다).
    if (scrubbingRef.current) {
      scrubbingRef.current = false;

      return false;
    }

    const entry = bagRouteList
      .getEntries()
      .find(item => item.key === request.key);
    const bounds = entry?.route.getBounds() ?? null;

    if (!bounds) {
      return false;
    }

    // 명시적 선택이 카메라를 정했으므로 늦게 온 데이터가 최초 맞춤으로 되돌리지 않게 한다.
    didFitRef.current = true;
    fitBounds(bounds);

    return true;
  }, [bagRouteList, fitBounds]);

  const handleMapInitialized = useCallback(() => {
    mapReadyRef.current = true;

    if (fitFocusedRoute()) {
      return;
    }

    fitInitialCamera();
  }, [fitFocusedRoute, fitInitialCamera]);

  // 데이터가 늦게 도착해도 한 번은 맞춘다.
  useEffect(() => {
    fitInitialCamera();
  }, [fitInitialCamera, entries.length]);

  // 목록 행을 누를 때마다(같은 코스를 다시 눌러도) 그 코스로 옮긴다.
  useEffect(() => {
    fitFocusedRoute();
  }, [fitFocusedRoute, focusRequest]);

  /**
   * 그래프 훑기 (GRP-8과 같은 규칙). **카메라는 건드리지 않는다** — 손가락 아래에서 지도가
   * 움직이면 그래프의 x와 지도 위 지점이 매 프레임 어긋나 위치를 읽을 수 없다. 마커만 옮긴다.
   */
  const handleScrub = useCallback(
    (sample: RouteElevationSample | null) => {
      const key = bagRouteList.getSelectedKey() ?? '';

      scrubbingRef.current = !!sample;
      setScrub(previous => {
        if (!sample) {
          return null;
        }

        // 같은 표본이면 이전 객체를 그대로 돌려준다 — 한 번 훑는 동안 들어오는 수십 번의
        // 이벤트가 그대로 렌더가 되면 지도 마커가 프레임마다 네이티브로 다시 동기화된다.
        if (previous?.sample === sample && previous.key === key) {
          return previous;
        }

        return { key, sample };
      });
    },
    [bagRouteList]
  );

  const profile = selected?.route.getElevationProfile() ?? null;
  // 그래프가 걷힌 뒤(코스 교체)에는 남은 표본을 그리지 않는다.
  const scrubSample =
    profile && scrub?.key === (selectedKey ?? '') ? scrub.sample : null;

  return (
    <View style={styles.root}>
      <View style={styles.mapArea}>
        <NaverMapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialCamera={KOREA_CAMERA}
          isShowLocationButton={false}
          isShowZoomControls={false}
          isShowScaleBar={false}
          onInitialized={handleMapInitialized}
        >
          <RoutePathOverlayView
            routes={routes}
            selectedRouteId={selectedRoute?.getId() ?? null}
          />
          {/* 선택한 코스의 시작·끝(GRP-8과 같은 규칙) — 옅게 그린 코스엔 달지 않는다. */}
          <RouteEndpointMarkersView route={selectedRoute} />
          {currentLocation ? (
            <MapMyLocationMarkerView
              latitude={currentLocation.latitude}
              longitude={currentLocation.longitude}
            />
          ) : null}
          {/* 고도 그래프를 훑는 동안만 뜨는 위치 마커. */}
          {scrubSample ? (
            <RouteScrubMarkerView
              latitude={scrubSample.latitude}
              longitude={scrubSample.longitude}
            />
          ) : null}
        </NaverMapView>

        {/* 내 위치 버튼 — 그룹 지도의 현재 위치 버튼과 같은 모양·같은 우측 16 자리(BD-11). */}
        <View style={styles.controlStack} pointerEvents='box-none'>
          <MapControlButtonView
            icon='locate'
            accessibilityLabel={app.getL10n().t('route.myLocation')}
            onPress={() => void moveToCurrentLocation()}
          />
        </View>
      </View>

      {/* 고도가 없는 코스는 그래프 자리를 아예 비운다 — 빈 틀은 "데이터를 못 불러왔다"로 읽힌다. */}
      {profile ? (
        <RouteElevationChartView
          // 코스를 바꾸면 그래프를 새로 마운트해 이전 코스의 커서가 남지 않게 한다.
          // 방향을 뒤집어도 새로 마운트한다 — 단면이 바뀌므로 커서가 옛 단면 자리에 남지 않게.
          key={`${selectedKey ?? ''}:${selectedRoute?.isReversed() ? 'r' : 'f'}`}
          profile={profile}
          // 축 거리는 목록 행과 같은 원본 거리로 읽힌다(BD-11).
          {...(selected
            ? { displayDistance: selected.route.getDistance() }
            : {})}
          onScrub={handleScrub}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Acg.bg,
  },
  // 지도는 남는 세로를 다 쓴다 — 목록·그래프는 아래에서 제 높이만 가져간다.
  mapArea: {
    flex: 1,
  },
  controlStack: {
    position: 'absolute',
    right: 16,
    bottom: CONTROL_BOTTOM_OFFSET,
    alignItems: 'flex-end',
    gap: 8,
  },
});

export default observer(BagRouteCanvasView);
