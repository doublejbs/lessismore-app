import { FC } from 'react';
import { Dimensions } from 'react-native';
import { observer } from 'mobx-react-lite';
import CampSiteMap from '@/model/camp-site/CampSiteMap';
import { CampSpot } from '@/model/camp-site/CampSpotTypes';
import { zoomToDelta } from '@/model/map/MapZoom';
import CampSiteMarkerView from './CampSiteMarkerView';

// 지도 카메라의 양자화된 뷰포트 상태(CampSiteMapView가 onCameraChanged에서 만든다).
export interface CampSiteMapViewport {
  latitude: number;
  longitude: number;
  zoom: number;
}

interface Props {
  campSiteMap: CampSiteMap;
  viewport: CampSiteMapViewport | null;
  // 줌 임계 이상으로 확대된 상태 — 화면 영역 안 전량 표시(아니면 샘플링, CS-2).
  markersVisible: boolean;
  onTapSpot: (spot: CampSpot) => void;
}

// 마커 레이어(CS-2). 지도 화면에서 분리된 observer라 카메라 이동(viewport 변경)과
// spots·유형 필터 변경에만 리렌더된다 — 검색 타이핑·요약 카드 오픈은 영향을 주지 않는다.
// 줌인·줌아웃 어느 쪽이든 뷰포트 밖 마커는 그리지 않는다. 전체 spots(400+)를
// 네이티브 마커로 전부 올리면 커스텀 뷰 캡처·캡션 충돌 계산 탓에 지도 전체가 느려진다.
const CampSiteMapMarkersView: FC<Props> = observer(
  ({ campSiteMap, viewport, markersVisible, onTapSpot }) => {
    if (!viewport) {
      return null;
    }

    // 뷰포트 줌 → 위도 스팬. 경도 스팬은 화면 비율로 근사한다.
    // 여백은 스팬의 5% + 0.03° — 뷰포트 중심 양자화(0.05° 단위) 오차를 덮어
    // 화면 가장자리 마커가 잘리지 않게 한다.
    const latSpan = zoomToDelta(viewport.zoom);
    const { width, height } = Dimensions.get('window');
    const lngSpan = latSpan * (width / height);
    const latPad = latSpan * 0.05 + 0.03;
    const lngPad = lngSpan * 0.05 + 0.03;
    const region = {
      minLatitude: viewport.latitude - latSpan / 2 - latPad,
      maxLatitude: viewport.latitude + latSpan / 2 + latPad,
      minLongitude: viewport.longitude - lngSpan / 2 - lngPad,
      maxLongitude: viewport.longitude + lngSpan / 2 + lngPad,
    };

    const spots = markersVisible
      ? campSiteMap.getSpotsInRegion(region)
      : campSiteMap.getSampledSpots(region);

    return (
      <>
        {spots.map(spot => (
          <CampSiteMarkerView key={spot.id} spot={spot} onTapSpot={onTapSpot} />
        ))}
      </>
    );
  }
);

export default CampSiteMapMarkersView;
