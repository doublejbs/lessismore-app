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
import { Acg } from '@/constants/DesignTokens';
import BagRouteList from '@/model/bag-route/BagRouteList';
import { deltaToZoom } from '@/model/map/MapZoom';
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

/** 경계 상자가 화면 가장자리에 붙지 않도록 주는 여유 배율. */
const CAMERA_PADDING_RATIO = 1.3;

/** 최소 표시 범위(도). 아주 짧은 코스는 상자가 0에 가까워 최대 줌으로 붙어 버린다. */
const MIN_REGION_DELTA = 0.004;

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

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      mapReadyRef.current = false;
    };
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

    const latitudeDelta = Math.max(
      (bounds.maxLat - bounds.minLat) * CAMERA_PADDING_RATIO,
      MIN_REGION_DELTA
    );
    const longitudeDelta = Math.max(
      (bounds.maxLng - bounds.minLng) * CAMERA_PADDING_RATIO,
      MIN_REGION_DELTA
    );

    mapRef.current?.animateRegionTo({
      latitude: (bounds.minLat + bounds.maxLat) / 2 - latitudeDelta / 2,
      longitude: (bounds.minLng + bounds.maxLng) / 2 - longitudeDelta / 2,
      latitudeDelta,
      longitudeDelta,
      duration: 500,
    });
  }, [bagRouteList]);

  const handleMapInitialized = useCallback(() => {
    mapReadyRef.current = true;
    fitInitialCamera();
  }, [fitInitialCamera]);

  // 데이터가 늦게 도착해도 한 번은 맞춘다.
  useEffect(() => {
    fitInitialCamera();
  }, [fitInitialCamera, entries.length]);

  /**
   * 그래프 훑기 (GRP-8과 같은 규칙). **카메라는 건드리지 않는다** — 손가락 아래에서 지도가
   * 움직이면 그래프의 x와 지도 위 지점이 매 프레임 어긋나 위치를 읽을 수 없다. 마커만 옮긴다.
   */
  const handleScrub = useCallback(
    (sample: RouteElevationSample | null) => {
      const key = bagRouteList.getSelectedKey() ?? '';

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
            selectedRouteId={selected?.route.getId() ?? null}
          />
          {/* 고도 그래프를 훑는 동안만 뜨는 위치 마커. */}
          {scrubSample ? (
            <RouteScrubMarkerView
              latitude={scrubSample.latitude}
              longitude={scrubSample.longitude}
            />
          ) : null}
        </NaverMapView>
      </View>

      {/* 고도가 없는 코스는 그래프 자리를 아예 비운다 — 빈 틀은 "데이터를 못 불러왔다"로 읽힌다. */}
      {profile ? (
        <RouteElevationChartView
          // 코스를 바꾸면 그래프를 새로 마운트해 이전 코스의 커서가 남지 않게 한다.
          key={selectedKey ?? ''}
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
});

export default observer(BagRouteCanvasView);
