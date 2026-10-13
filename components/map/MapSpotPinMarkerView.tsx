import { FC } from 'react';
import MapPinCaptionMarkerView from '@/components/map/MapPinCaptionMarkerView';
import { CampSpot } from '@/model/camp-site/CampSpotTypes';

interface Props {
  spot: CampSpot;
  // 마커 id 접두사 — 화면마다 다르게(같은 지도에 같은 id가 둘 서지 않게).
  idPrefix: string;
  // 핀 폭(pt). 높이는 30:40 비율. 기본 30(박지 지도·그룹 지도), 그룹 상세 밴드는 22.
  pinWidth?: number;
  // 핀 위 이름 캡션. 기본 true. 110pt 밴드처럼 좁은 곳은 끈다.
  showCaption?: boolean;
  // 선택 박지(박지 지도 CS-2)면 접근성 상태에 선택을 싣는다.
  selected?: boolean;
  // 누를 수 있으면 버튼이다(접근성 역할 + 44pt 터치 폭). 없으면 터치를 지도로 흘린다.
  onPress?: () => void;
}

/**
 * 박지 핀 마커 (MAP-2 · CS-2 · GRP-7 · GRP-10) — 이름 캡션 핀(`MapPinCaptionMarkerView`)에 박지를 얹는다.
 * 박지 지도의 선택 박지(`CampSiteSpotsLayerView`), 그룹 지도의 연결 박지, 그룹 상세 밴드가 함께 쓴다.
 *
 * - **호출부는 `key={spot.id}`를 준다** — SDK `Marker`는 `id`를 처음 값으로 얼려, 같은 자리에서 박지만 바뀌면
 *   옛 id가 남는다. 키가 바뀌면 마커를 새로 만든다.
 */
const MapSpotPinMarkerView: FC<Props> = ({
  spot,
  idPrefix,
  pinWidth,
  showCaption,
  selected,
  onPress,
}) => {
  return (
    <MapPinCaptionMarkerView
      markerId={`${idPrefix}-${spot.id}`}
      name={spot.name}
      latitude={spot.location.latitude}
      longitude={spot.location.longitude}
      {...(pinWidth !== undefined ? { pinWidth } : {})}
      {...(showCaption !== undefined ? { showCaption } : {})}
      {...(selected !== undefined ? { selected } : {})}
      {...(onPress ? { onPress } : {})}
    />
  );
};

export default MapSpotPinMarkerView;
