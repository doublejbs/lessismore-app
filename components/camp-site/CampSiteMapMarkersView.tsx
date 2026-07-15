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
  selectedSpotId?: string | null;
  onTapSpot: (spot: CampSpot) => void;
}

// 마커 레이어(CS-2). 지도 화면에서 분리된 observer라 카메라 이동(viewport 변경)과
// spots·유형 필터 변경에만 리렌더된다 — 검색 타이핑·요약 카드 오픈은 영향을 주지 않는다.
// 줌 수준과 무관하게 뷰포트 안 마커는 전량 표시하되(겹침은 캡션 숨김이 처리),
// 뷰포트 밖 마커는 그리지 않는다 — 화면 밖까지 전부 네이티브 마커로 올릴 이유가 없다.
const CampSiteMapMarkersView: FC<Props> = observer(
  ({ campSiteMap, viewport, selectedSpotId, onTapSpot }) => {
    if (!viewport) {
      return null;
    }

    // selectedSpotId를 넘기는 화면(배낭 여행지 피커)은 그 값을, 안 넘기는 지도 탭은
    // 모델의 선택 상태(campSiteMap.getSelectedSpot)를 따른다 — 마커 탭 → 요약 카드와 동시에 선택 마커 강조.
    const effectiveSelectedId =
      selectedSpotId === undefined
        ? (campSiteMap.getSelectedSpot()?.id ?? null)
        : selectedSpotId;

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

    const spots = campSiteMap.getSpotsInRegion(region);

    return (
      <>
        {spots.map(spot => (
          <CampSiteMarkerView
            key={spot.id}
            spot={spot}
            selected={effectiveSelectedId === spot.id}
            onTapSpot={onTapSpot}
          />
        ))}
      </>
    );
  }
);

export default CampSiteMapMarkersView;
