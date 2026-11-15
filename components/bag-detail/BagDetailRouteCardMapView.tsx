import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import AppMapView, {
  AppMapInitialCamera,
  AppMapViewRef,
} from '@/components/map/AppMapView';
import MapRoutePathLayersView from '@/components/map/MapRoutePathLayersView';
import app from '@/model/app/App';
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
  // 카드의 대표 코스(BD-11 선택 기억 → 첫 코스). 이 코스 선 하나만 그린다.
  route: RouteDisplay;
  // 지도 데이터를 못 불러왔다 — 카드가 지도 칸을 걷는다(빈 지면 칸은 "깨진 지도"로 읽힌다).
  onLoadFailed: () => void;
}

const toInitialCamera = (region: RouteCameraRegion): AppMapInitialCamera => ({
  bounds: lngLatBoundsToRouteBounds(regionToLngLatBounds(region)),
  padding: 0,
});

/**
 * 여행 상세 코스 카드의 지도 칸 (RD-9 #5 · MAP-3 · MAP-4).
 *
 * **정적 이미지가 아니라 제스처를 끈 실제 지도다**(`AppMapView interactive={false}`) — 정적 썸네일(MAP-3
 * `useStaticMapImage`)은 중심·줌만 받아 코스 선을 그릴 수 없다. 그룹 상세 지도 밴드(GRP-7
 * `GroupDetailMapBandView`)·운동 경로 지도(HA-4)와 같은 방식이다.
 *
 * - 대표 코스 선 하나만 그린다(선택 굵기). 출발·도착 말풍선은 두지 않는다 — 낮은 칸을 덮는다(방향은 코스 화면에서).
 * - 지도는 상자가 있을 때만 붙이고, 붙인 뒤 대표 코스가 바뀌면 새로 만들지 않고 `fitRegion(region, 0)`으로 맞춘다.
 * - 터치는 받지 않는다 — 카드가 위에 덮개 `Pressable`을 올려 RN이 받는다(Android `ScrollView` 세로 스크롤 보존).
 * - 출처 ⓘ는 지도 기본 attribution을 켜 둔다(ODbL — 보이면 된다, MAP-1). 장식이라 접근성 트리에서 뺀다.
 * - MapLibre SDK를 최상위 import하므로 카드가 `createMapLibreViewLoader`로 싣는다. 웹은 `.web.tsx`.
 */
const BagDetailRouteCardMapView: FC<Props> = ({ route, onLoadFailed }) => {
  const mapRef = useRef<AppMapViewRef>(null);
  const loggedLoadFailureRef = useRef(false);
  const bounds = route.getBounds();
  // 상자 **값**으로 영역을 기억한다 — 포커스마다 목록을 다시 읽으면 코스 객체가 새로 만들어진다.
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
  const [initialRegion, setInitialRegion] = useState(region);
  const appliedRegionRef = useRef<RouteCameraRegion | null>(null);

  if (region && !initialRegion) {
    setInitialRegion(region);
  }

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
    onLoadFailed();

    if (loggedLoadFailureRef.current) {
      return;
    }

    loggedLoadFailureRef.current = true;
    app
      .getAnalyticsManager()
      ?.logEvent('map_load_failed', { screen: 'bag_route_card' });
  }, [onLoadFailed]);

  if (!initialRegion) {
    return null;
  }

  return (
    <View
      style={StyleSheet.absoluteFill}
      accessible={false}
      accessibilityElementsHidden={true}
      importantForAccessibility='no-hide-descendants'
    >
      <AppMapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialCamera={toInitialCamera(initialRegion)}
        interactive={false}
        showCompass={false}
        onLoadFailed={handleLoadFailed}
      >
        <MapRoutePathLayersView
          routes={[route]}
          selectedRouteId={route.getId()}
        />
      </AppMapView>
    </View>
  );
};

// observer — 코스 선이 뒤집기 설정(observable)을 읽는다.
export default observer(BagDetailRouteCardMapView);
