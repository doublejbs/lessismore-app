import { FC, Ref } from 'react';
import { StyleSheet } from 'react-native';
import AppMapView, {
  AppMapCameraChange,
  AppMapViewRef,
} from '@/components/map/AppMapView';
import MapMyLocationMarkerView from '@/components/map/MapMyLocationMarkerView';
import CampSiteMap from '@/model/camp-site/CampSiteMap';
import { CampSpot } from '@/model/camp-site/CampSpotTypes';
import { KOREA_CAMERA } from '@/model/map/MapCamera';
import CampSiteMapMarkersView from './CampSiteMapMarkersView';

interface Props {
  campSiteMap: CampSiteMap;
  // 내 위치 파란 점 좌표(권한 허용 + 좌표가 있을 때만 그린다, CS-1).
  currentLocation: { latitude: number; longitude: number } | null;
  ornamentTopOffset: number;
  attributionBottomOffset: number;
  onTapSpot: (spot: CampSpot) => void;
  onPressMap: () => void;
  onCameraChanged: (change: AppMapCameraChange) => void;
  onInitialized: () => void;
  onLoadFailed: () => void;
  ref?: Ref<AppMapViewRef>;
}

/**
 * 박지 지도 본문 (CS-1 · CS-2 · MAP-4) — `AppMapView` + 박지 GeoJSON 레이어 + 내 위치 마커.
 * MapLibre SDK를 최상위 import하므로 화면(`CampSiteMapView`)은 이 파일을 `createMapLibreViewLoader`로 싣는다
 * (옛 바이너리 방어). 웹은 `CampSiteMapCanvasView.web.tsx`.
 *
 * 방향 모드가 없어 내 위치 부채꼴이 없다 — 지도 방위를 추적하지 않는다(회전 중 프레임마다 리렌더하지 않게).
 */
const CampSiteMapCanvasView: FC<Props> = ({
  campSiteMap,
  currentLocation,
  ornamentTopOffset,
  attributionBottomOffset,
  onTapSpot,
  onPressMap,
  onCameraChanged,
  onInitialized,
  onLoadFailed,
  ref,
}) => {
  return (
    <AppMapView
      {...(ref ? { ref } : {})}
      style={StyleSheet.absoluteFill}
      initialCamera={KOREA_CAMERA}
      ornamentTopOffset={ornamentTopOffset}
      attributionBottomOffset={attributionBottomOffset}
      onInitialized={onInitialized}
      onLoadFailed={onLoadFailed}
      onPress={onPressMap}
      onCameraChanged={onCameraChanged}
    >
      <CampSiteMapMarkersView campSiteMap={campSiteMap} onTapSpot={onTapSpot} />
      {currentLocation ? (
        <MapMyLocationMarkerView
          latitude={currentLocation.latitude}
          longitude={currentLocation.longitude}
        />
      ) : null}
    </AppMapView>
  );
};

export default CampSiteMapCanvasView;
