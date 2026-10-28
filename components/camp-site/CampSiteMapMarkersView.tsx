import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import CampSiteSpotsLayerView from '@/components/map/CampSiteSpotsLayerView';
import CampSiteMap from '@/model/camp-site/CampSiteMap';
import { CampSpot } from '@/model/camp-site/CampSpotTypes';

interface Props {
  campSiteMap: CampSiteMap;
  selectedSpotId?: string | null;
  onTapSpot: (spot: CampSpot) => void;
}

/**
 * 박지 마커 레이어 (CS-2 · MAP-4) — 필터(검색·유형·태그·즐겨찾기)를 적용한 박지 전체를 공용 GeoJSON 레이어
 * (`CampSiteSpotsLayerView`)에 넘긴다. 뷰포트 밖 렌더 제외·캡션 충돌 숨김은 엔진이 하므로 화면 영역으로
 * 거르지 않는다. 지도 화면에서 분리된 observer라 spots·필터·선택 변경에만 리렌더된다 — 검색 타이핑·카메라
 * 이동은 영향을 주지 않는다.
 */
const CampSiteMapMarkersView: FC<Props> = observer(
  ({ campSiteMap, selectedSpotId, onTapSpot }) => {
    // selectedSpotId를 넘기는 화면(배낭 여행지 선택기)은 그 값을, 안 넘기는 지도 탭은
    // 모델의 선택 상태(campSiteMap.getSelectedSpot)를 따른다 — 마커 탭 → 상세 시트와 동시에 선택 핀.
    const effectiveSelectedId =
      selectedSpotId === undefined
        ? (campSiteMap.getSelectedSpot()?.id ?? null)
        : selectedSpotId;

    return (
      <CampSiteSpotsLayerView
        spots={campSiteMap.getVisibleSpots()}
        selectedSpotId={effectiveSelectedId}
        onPressSpot={onTapSpot}
      />
    );
  }
);

export default CampSiteMapMarkersView;
