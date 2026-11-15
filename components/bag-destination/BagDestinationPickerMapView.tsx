import { FC, Ref } from 'react';
import { StyleSheet } from 'react-native';
import AppMapView, {
  AppMapCameraChange,
  AppMapViewRef,
} from '@/components/map/AppMapView';
import CampSiteMapMarkersView from '@/components/camp-site/CampSiteMapMarkersView';
import CampSiteMap from '@/model/camp-site/CampSiteMap';
import { CampSpot } from '@/model/camp-site/CampSpotTypes';

interface Props {
  campSiteMap: CampSiteMap;
  // 지도를 붙일 때의 카메라 — 정해진 뒤에만 이 뷰를 마운트한다(DST-3).
  origin: { latitude: number; longitude: number; zoom: number };
  // 저장 중에는 제스처를 막는다(DST-6).
  interactive: boolean;
  // 지금 들여다보는 박지 — 선택 핀 강조(DST-3).
  focusedSpotId: string | null;
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
 * 여행지 선택기 지도 본문 (DST-3 · MAP-4) — `AppMapView` + 박지 레이어(지도 탭과 같은 `CampSiteSpotsLayerView`).
 * 중앙 핀·하단 패널은 화면(`BagDestinationPickerView`)의 RN 오버레이다. MapLibre SDK를 최상위 import하므로
 * 화면은 이 파일을 `createMapLibreViewLoader`로 싣는다(옛 바이너리 방어). 웹은 `.web.tsx`.
 */
const BagDestinationPickerMapView: FC<Props> = ({
  campSiteMap,
  origin,
  interactive,
  focusedSpotId,
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
      initialCamera={origin}
      interactive={interactive}
      ornamentTopOffset={ornamentTopOffset}
      attributionBottomOffset={attributionBottomOffset}
      onInitialized={onInitialized}
      onLoadFailed={onLoadFailed}
      onPress={onPressMap}
      onCameraChanged={onCameraChanged}
    >
      <CampSiteMapMarkersView
        campSiteMap={campSiteMap}
        // 확정 대상 선택 상태는 없다(DST-3) — 강조는 **지금 들여다보는 박지**에만 준다.
        // 배낭에 저장된 박지를 폴백으로 강조하지 않는 이유: 저장 상태는 "선택 중"이
        // 아닌데도 마커가 계속 선택된 것처럼 보여, 포커스 해제 후에도 강조가 남는다.
        selectedSpotId={focusedSpotId}
        onTapSpot={onTapSpot}
      />
    </AppMapView>
  );
};

export default BagDestinationPickerMapView;
