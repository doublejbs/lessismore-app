import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Marker } from '@maplibre/maplibre-react-native';
import { observer } from 'mobx-react-lite';
import {
  MAP_BAND_HEIGHT,
  STANDALONE_BOTTOM_GAP,
} from '@/components/bag-snapshot/SnapshotMapBandView';
import SpotPinView from '@/components/camp-site/SpotPinView';
import AppMapView, {
  AppMapInitialCamera,
  AppMapViewRef,
} from '@/components/map/AppMapView';
import MapPointMarkersView from '@/components/map/MapPointMarkersView';
import MapRoutePathLayersView from '@/components/map/MapRoutePathLayersView';
import { Acg, AcgRadius } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import { CampSpot } from '@/model/camp-site/CampSpotTypes';
import GroupPoint from '@/model/group/GroupPoint';
import { getGroupMapBandBounds } from '@/model/group-detail/GroupDetailMapBand';
import {
  lngLatBoundsToRouteBounds,
  regionToLngLatBounds,
} from '@/model/map/MapCamera';
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
 * 그룹 상세 상단의 코스·포인트 지도 밴드 (GRP-7 · MAP-3 · MAP-4).
 *
 * **정적 이미지가 아니라 제스처를 끈 실제 지도다**(`AppMapView interactive={false}`). 정적 썸네일은 중심·줌만
 * 받아 코스 선·포인트를 그릴 수 없다. 운동 경로 지도(HA-4, `BagActivityRouteMapView`)와 같은 방식이다.
 *
 * - **보기 전용**: 제스처를 모두 끄고, 그 위에 밴드 전체를 덮는 `Pressable`을 올려 터치를 RN이 받는다 —
 *   네이티브 지도가 터치를 먼저 잡으면 Android `ScrollView`가 세로 드래그를 가로채지 못해 상세 화면이
 *   스크롤되지 않는다. 누르면 그룹 지도로 간다.
 * - 처음 자리는 지도를 붙일 때의 초기 카메라(상자)로 주고, 데이터가 다시 읽혀 상자가 바뀌면 지도를 새로
 *   만들지 않고 카메라만 즉시(애니메이션 없이) 맞춘다.
 * - 코스는 선택 개념 없이 **전부 같은 굵기**다. 시작·끝 마커는 두지 않는다 — 코스 수 × 2개의
 *   마커가 110pt 밴드를 덮고, 방향은 그룹 지도에서 본다. 포인트는 캡션 없는 작은 마커다.
 * - 출처 표기는 지도 기본(좌하단 ⓘ)이다 — 덮개 `Pressable` 아래라 밴드에서는 누를 수 없고, 누르고 들어간
 *   그룹 지도에서 열린다.
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
  // 지도를 붙일 때의 카메라 — 처음 영역 하나로 정한다(이후 바뀐 영역은 아래 이펙트가 카메라로 맞춘다).
  const [initialCamera] = useState<AppMapInitialCamera | null>(() =>
    region
      ? {
          bounds: lngLatBoundsToRouteBounds(regionToLngLatBounds(region)),
          padding: 0,
        }
      : null
  );
  const appliedRegionRef = useRef(region);

  // 붙인 뒤 데이터가 바뀌면(코스 추가·포인트 등록 뒤 돌아옴) 지도를 새로 만들지 않고 카메라만 맞춘다.
  useEffect(() => {
    if (!region || appliedRegionRef.current === region) {
      return;
    }

    appliedRegionRef.current = region;
    mapRef.current?.fitRegion(region, 0);
  }, [region]);

  if (!region) {
    return null;
  }

  return (
    <View style={styles.band}>
      <AppMapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        {...(initialCamera ? { initialCamera } : {})}
        interactive={false}
        showCompass={false}
      >
        <MapRoutePathLayersView
          routes={routes}
          selectedRouteId={null}
          uniform
        />
        {campSpot ? (
          <Marker
            id={`group-band-spot-${campSpot.id}`}
            lngLat={[campSpot.location.longitude, campSpot.location.latitude]}
            anchor='bottom'
          >
            <View
              collapsable={false}
              pointerEvents='none'
              style={styles.spotPin}
            >
              <SpotPinView width={SPOT_PIN_WIDTH} />
            </View>
          </Marker>
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
  spotPin: {
    width: SPOT_PIN_WIDTH,
    height: SPOT_PIN_HEIGHT,
  },
  pressed: {
    backgroundColor: Acg.inkTint,
  },
});

export default observer(GroupDetailMapBandView);
