import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InteractionManager, Pressable, StyleSheet, View } from 'react-native';
import {
  NaverMapMarkerOverlay,
  NaverMapView,
  NaverMapViewRef,
} from '@mj-studio/react-native-naver-map';
import { observer } from 'mobx-react-lite';
import {
  MAP_BAND_HEIGHT,
  STANDALONE_BOTTOM_GAP,
} from '@/components/bag-snapshot/SnapshotMapBandView';
import SpotPinView from '@/components/camp-site/SpotPinView';
import GroupPointMarkerView from '@/components/group/map/GroupPointMarkerView';
import RoutePathOverlayView from '@/components/route/RoutePathOverlayView';
import { Acg, AcgRadius } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import { CampSpot } from '@/model/camp-site/CampSpotTypes';
import GroupPoint from '@/model/group/GroupPoint';
import { getGroupMapBandBounds } from '@/model/group-detail/GroupDetailMapBand';
import { getRouteFitRegion } from '@/model/route/RouteCamera';
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
const SPOT_PIN_HEIGHT = (SPOT_PIN_WIDTH * 40) / 30;

/**
 * 그룹 상세 상단의 코스·포인트 지도 밴드 (GRP-7).
 *
 * **정적 이미지가 아니라 제스처를 끈 실제 지도다.** NCP Static Map(`StaticMapUrl.ts`)은 중심·
 * 줌·마커만 받고 경로(선) 파라미터가 없어 코스를 그릴 수 없다(전용 키가 없는 빌드에서는 박지
 * 밴드조차 그려지지 않는다). 그래서 배낭 상세의 운동 경로 지도(HA-4,
 * `BagActivityRouteMapView`)와 같은 방식을 쓴다.
 *
 * - **보기 전용**: 팬·줌·기울이기·회전·멈춤 제스처를 모두 끈다. 그 위에 밴드 전체를 덮는
 *   `Pressable`을 올려 터치를 RN이 받는다 — 네이티브 지도가 터치를 먼저 잡으면 Android
 *   `ScrollView`가 세로 드래그를 가로채지 못해 상세 화면이 스크롤되지 않는다. 누르면 그룹 지도로 간다.
 * - **Android는 TextureView**(`isUseTextureViewAndroid`): 기본 SurfaceView는 별도 창에 그려져
 *   스크롤 중 위치가 한 박자 늦게 따라오고 모서리 둥글림(`overflow: hidden`)도 먹지 않는다.
 * - **지연 마운트**: 동적 지도는 뷰 생성이 무겁다(NCP Mobile Dynamic Map은 뷰 생성당 과금이기도
 *   하다). 화면 전환 애니메이션이 끝난 뒤에 붙이고, 그 전까지는 같은 크기의 연회색 면으로 자리를
 *   잡아 레이아웃이 밀리지 않게 한다. 데이터가 다시 읽혀도 지도를 새로 만들지 않고 카메라만 옮긴다.
 * - 코스는 선택 개념 없이 **전부 같은 굵기**다. 시작·끝 마커는 두지 않는다 — 코스 수 × 2개의
 *   마커가 110pt 밴드를 덮고, 방향은 그룹 지도에서 본다. 포인트는 캡션 없는 작은 마커다.
 * - 밴드 자체는 콘텐츠 면이라 그림자가 없다(HM-8 — 그림자는 지도 **위에 뜨는** 요소의 몫이다).
 */
const GroupDetailMapBandView: FC<Props> = ({
  routes,
  points,
  campSpot,
  onPress,
}) => {
  const l10n = app.getL10n();
  const mapRef = useRef<NaverMapViewRef>(null);
  const mapReadyRef = useRef(false);
  const [isMapMounted, setIsMapMounted] = useState(false);
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
  // 지도 초기화 콜백이 읽는 최신 영역. 렌더 중에는 쓰지 않고 아래 이펙트가 갱신한다.
  const regionRef = useRef(region);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setIsMapMounted(true);
    });

    return () => {
      task.cancel();
      mapReadyRef.current = false;
    };
  }, []);

  // 마운트 뒤 데이터가 바뀌면(코스 추가·포인트 등록 뒤 돌아옴) 지도를 새로 만들지 않고 카메라만 맞춘다.
  useEffect(() => {
    regionRef.current = region;

    if (!region || !mapReadyRef.current || !mapRef.current) {
      return;
    }

    mapRef.current.animateRegionTo({ ...region, duration: 0 });
  }, [region]);

  // 지연 마운트와 초기화 사이에 상자가 바뀌었을 수 있다 — 준비되면 지금 상자로 한 번 맞춘다.
  const handleInitialized = useCallback(() => {
    mapReadyRef.current = true;

    const current = regionRef.current;

    if (current && mapRef.current) {
      mapRef.current.animateRegionTo({ ...current, duration: 0 });
    }
  }, []);

  if (!region) {
    return null;
  }

  return (
    <View style={styles.band}>
      {isMapMounted ? (
        <NaverMapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={region}
          isShowLocationButton={false}
          isShowZoomControls={false}
          isShowScaleBar={false}
          isShowCompass={false}
          isScrollGesturesEnabled={false}
          isZoomGesturesEnabled={false}
          isTiltGesturesEnabled={false}
          isRotateGesturesEnabled={false}
          isStopGesturesEnabled={false}
          isUseTextureViewAndroid
          onInitialized={handleInitialized}
        >
          <RoutePathOverlayView
            routes={routes}
            selectedRouteId={null}
            uniform
          />
          {campSpot ? (
            <NaverMapMarkerOverlay
              latitude={campSpot.location.latitude}
              longitude={campSpot.location.longitude}
              anchor={{ x: 0.5, y: 1 }}
              width={SPOT_PIN_WIDTH}
              height={SPOT_PIN_HEIGHT}
            >
              {/* 커스텀 View 마커는 최상위 자식에 collapsable=false가 필요하다(라이브러리 요구사항). */}
              <View
                key={campSpot.id}
                collapsable={false}
                style={styles.spotPin}
              >
                <SpotPinView width={SPOT_PIN_WIDTH} />
              </View>
            </NaverMapMarkerOverlay>
          ) : null}
          {points.map(point => (
            <GroupPointMarkerView
              key={point.getId()}
              point={point}
              selected={false}
              compact
            />
          ))}
        </NaverMapView>
      ) : null}
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
    // 지연 마운트 전 자리 — 지면과 한 단 갈리는 면(HM-8).
    backgroundColor: Acg.controlFill,
  },
  spotPin: {
    width: SPOT_PIN_WIDTH,
    height: SPOT_PIN_HEIGHT,
  },
  pressed: {
    backgroundColor: Acg.inkTint,
  },
});

export default observer(GroupDetailMapBandView);
