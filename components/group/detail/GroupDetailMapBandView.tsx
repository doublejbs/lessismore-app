import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import {
  MAP_BAND_HEIGHT,
  STANDALONE_BOTTOM_GAP,
} from '@/components/bag-snapshot/SnapshotMapBandView';
import AppMapView, {
  AppMapInitialCamera,
  AppMapViewRef,
} from '@/components/map/AppMapView';
import MapAttributionNoteView from '@/components/map/MapAttributionNoteView';
import MapPointMarkersView from '@/components/map/MapPointMarkersView';
import MapRoutePathLayersView from '@/components/map/MapRoutePathLayersView';
import MapSpotPinMarkerView from '@/components/map/MapSpotPinMarkerView';
import { Acg, AcgRadius } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import { CampSpot } from '@/model/camp-site/CampSpotTypes';
import GroupPoint from '@/model/group/GroupPoint';
import { getGroupMapBandBounds } from '@/model/group-detail/GroupDetailMapBand';
import {
  lngLatBoundsToRouteBounds,
  regionToLngLatBounds,
} from '@/model/map/MapCamera';
import {
  getRouteFitRegion,
  RouteCameraRegion,
} from '@/model/route/RouteCamera';
import { RouteDisplay } from '@/model/route/RouteDisplay';

interface Props {
  routes: readonly RouteDisplay[];
  points: readonly GroupPoint[];
  // 등록 박지. 핀을 함께 그리고 카메라가 박지까지 담는다(GRP-7).
  campSpot: CampSpot | null;
  onPress: () => void;
}

// 박지 핀 크기 — 그룹 지도(`GroupMapCanvasView`)의 박지 마커보다 한 단 작게. 밴드 높이가 110pt다.
const SPOT_PIN_WIDTH = 22;

const toInitialCamera = (region: RouteCameraRegion): AppMapInitialCamera => ({
  bounds: lngLatBoundsToRouteBounds(regionToLngLatBounds(region)),
  padding: 0,
});

/**
 * 그룹 상세 상단의 코스·포인트 지도 밴드 (GRP-7 · MAP-3 · MAP-4).
 *
 * **정적 이미지가 아니라 제스처를 끈 실제 지도다**(`AppMapView interactive={false}`). 정적 썸네일은 중심·줌만
 * 받아 코스 선·포인트를 그릴 수 없다. 운동 경로 지도(HA-4, `BagActivityRouteMapView`)와 같은 방식이다.
 *
 * - **보기 전용**: 제스처를 모두 끄고, 그 위에 밴드 전체를 덮는 `Pressable`을 올려 터치를 RN이 받는다 —
 *   네이티브 지도가 터치를 먼저 잡으면 Android `ScrollView`가 세로 드래그를 가로채지 못해 상세 화면이
 *   스크롤되지 않는다. 누르면 그룹 지도로 간다.
 * - 지도는 영역(상자)이 생긴 뒤에야 붙인다 — 붙일 때의 영역을 초기 카메라로 준다(세계 지도에서 날아오지 않는다).
 *   그 뒤 데이터가 다시 읽혀 상자가 바뀌면 지도를 새로 만들지 않고 `fitRegion(region, 0)`으로 즉시 맞춘다 —
 *   스타일 로드 전이면 `AppMapView`가 모아 두었다가 로드가 끝나는 순간 실행한다.
 * - 지도 데이터를 못 불러오면(`onLoadFailed`) 밴드를 숨긴다 — 빈 지면 밴드는 "깨진 지도"로 읽힌다(BAG-1과 같은
 *   규칙). `map_load_failed`(screen `group_band`)를 남긴다(MAP-6).
 * - 코스는 선택 개념 없이 **전부 같은 굵기**다. 시작·끝 마커는 두지 않는다 — 코스 수 × 2개의
 *   마커가 110pt 밴드를 덮고, 방향은 그룹 지도에서 본다. 포인트는 캡션 없는 작은 마커다.
 * - 출처 표기: 지도 기본 ⓘ는 덮개 `Pressable` 아래라 눌리지 않으므로 끄고, 정적 썸네일과 같은
 *   `© OpenStreetMap`(`MapAttributionNoteView`)을 우하단에 얹는다(ODbL — 출처가 보이면 된다, MAP-1 · MAP-3).
 * - 밴드 자체는 콘텐츠 면이라 그림자가 없다(HM-8 — 그림자는 지도 **위에 뜨는** 요소의 몫이다).
 */
const GroupDetailMapBandView: FC<Props> = ({
  routes,
  points,
  campSpot,
  onPress,
}) => {
  const l10n = app.getL10n();
  const mapRef = useRef<AppMapViewRef>(null);
  const bounds = getGroupMapBandBounds(routes, points, campSpot);
  /**
   * 상자 **값**으로 영역을 기억한다 — 포커스마다 목록을 다시 읽으면 배열이 새로 만들어지는데,
   * 값이 같은데도 영역 객체가 바뀌면 그때마다 카메라를 다시 맞추게 된다.
   */
  const boundsKey = bounds
    ? [bounds.minLat, bounds.maxLat, bounds.minLng, bounds.maxLng].join(',')
    : '';
  const region = useMemo(() => {
    if (!boundsKey) {
      return null;
    }

    const [minLat, maxLat, minLng, maxLng] = boundsKey.split(',').map(Number);

    return getRouteFitRegion({ minLat, maxLat, minLng, maxLng });
  }, [boundsKey]);
  // 지도가 붙을 때(영역이 처음 생긴 렌더)의 영역 — 초기 카메라. 지도는 붙을 때 한 번만 읽는다.
  const [initialRegion, setInitialRegion] = useState(region);
  // 카메라에 마지막으로 반영한 영역(첫 영역은 초기 카메라가 반영한다).
  const appliedRegionRef = useRef<RouteCameraRegion | null>(null);
  const loggedLoadFailureRef = useRef(false);
  const [isLoadFailed, setIsLoadFailed] = useState(false);

  if (region && !initialRegion) {
    setInitialRegion(region);
  }

  // 붙인 뒤 데이터가 바뀌면(코스 추가·포인트 등록 뒤 돌아옴) 지도를 새로 만들지 않고 카메라만 즉시 맞춘다.
  useEffect(() => {
    if (!region) {
      return;
    }

    if (!appliedRegionRef.current) {
      appliedRegionRef.current = region;

      return;
    }

    if (appliedRegionRef.current === region) {
      return;
    }

    appliedRegionRef.current = region;
    mapRef.current?.fitRegion(region, 0);
  }, [region]);

  const handleLoadFailed = useCallback(() => {
    setIsLoadFailed(true);

    if (loggedLoadFailureRef.current) {
      return;
    }

    loggedLoadFailureRef.current = true;
    app
      .getAnalyticsManager()
      ?.logEvent('map_load_failed', { screen: 'group_band' });
  }, []);

  if (!region || !initialRegion || isLoadFailed) {
    return null;
  }

  return (
    <View style={styles.band}>
      <AppMapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialCamera={toInitialCamera(initialRegion)}
        interactive={false}
        showCompass={false}
        showAttribution={false}
        onLoadFailed={handleLoadFailed}
      >
        <MapRoutePathLayersView
          routes={routes}
          selectedRouteId={null}
          uniform
        />
        {campSpot ? (
          <MapSpotPinMarkerView
            key={campSpot.id}
            spot={campSpot}
            idPrefix='group-band-spot'
            pinWidth={SPOT_PIN_WIDTH}
            showCaption={false}
          />
        ) : null}
        <MapPointMarkersView points={points} selectedPointId={null} compact />
      </AppMapView>
      {/* 밴드 전체가 하나의 버튼이다 — 지도는 보기 전용이라 터치를 받지 않는다. */}
      <Pressable
        style={({ pressed }) => [
          StyleSheet.absoluteFill,
          pressed && styles.pressed,
        ]}
        onPress={onPress}
        accessibilityRole='button'
        accessibilityLabel={l10n.t('group.detail.openMapBand')}
      />
      <MapAttributionNoteView />
    </View>
  );
};

const styles = StyleSheet.create({
  // 박지 밴드(`SnapshotMapBandView` Standalone)와 같은 높이·모서리·아래 간격이다.
  band: {
    height: MAP_BAND_HEIGHT,
    marginBottom: STANDALONE_BOTTOM_GAP,
    borderRadius: AcgRadius.thumb,
    overflow: 'hidden',
    // 타일이 뜨기 전 자리 — 지면과 한 단 갈리는 면(HM-8).
    backgroundColor: Acg.controlFill,
  },
  pressed: {
    backgroundColor: Acg.inkTint,
  },
});

export default observer(GroupDetailMapBandView);
