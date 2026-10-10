import { FC } from 'react';
import { Dimensions } from 'react-native';
import { observer } from 'mobx-react-lite';
import MapPoint from '@/model/point/MapPoint';
import { zoomToDelta } from '@/model/map/MapZoom';
import PointMarkerView from './PointMarkerView';

// 지도 카메라의 양자화된 뷰포트 상태(지도 화면이 onCameraChanged에서 만든다).
export interface PointMapViewport {
  latitude: number;
  longitude: number;
  zoom: number;
}

interface Props {
  // 지금 그릴 포인트(유형 필터가 걸린 목록). 뷰포트 밖 것은 여기서 거른다.
  points: readonly MapPoint[];
  viewport: PointMapViewport | null;
  selectedPointId: string | null;
  onTapPoint: (point: MapPoint) => void;
}

/**
 * 포인트 마커 레이어 (GRP-9 · GRP-10 · BD-14). 그룹 지도와 배낭 코스 화면이 함께 쓴다.
 *
 * 박지 지도(CS-2)와 같은 처리다 — **뷰포트 밖 마커는 그리지 않고**, 겹침은 캡션 숨김이
 * 맡는다. 지도 화면에서 분리된 observer라 카메라 이동과 포인트·필터 변경에만 리렌더된다.
 */
const PointMarkersView: FC<Props> = observer(
  ({ points, viewport, selectedPointId, onTapPoint }) => {
    if (!viewport) {
      return null;
    }

    // 뷰포트 줌 → 위도 스팬. 경도 스팬은 화면 비율로 근사한다.
    // 여백은 스팬의 5% + 0.03° — 뷰포트 중심 양자화 오차를 덮어 가장자리 마커가 잘리지 않게 한다.
    const latSpan = zoomToDelta(viewport.zoom);
    const { width, height } = Dimensions.get('window');
    const lngSpan = latSpan * (width / height);
    const latPad = latSpan * 0.05 + 0.03;
    const lngPad = lngSpan * 0.05 + 0.03;
    const minLatitude = viewport.latitude - latSpan / 2 - latPad;
    const maxLatitude = viewport.latitude + latSpan / 2 + latPad;
    const minLongitude = viewport.longitude - lngSpan / 2 - lngPad;
    const maxLongitude = viewport.longitude + lngSpan / 2 + lngPad;
    const visible = points.filter(
      point =>
        point.getLatitude() >= minLatitude &&
        point.getLatitude() <= maxLatitude &&
        point.getLongitude() >= minLongitude &&
        point.getLongitude() <= maxLongitude
    );

    return (
      <>
        {visible.map(point => (
          <PointMarkerView
            key={point.getId()}
            point={point}
            selected={selectedPointId === point.getId()}
            onTapPoint={onTapPoint}
          />
        ))}
      </>
    );
  }
);

export default PointMarkersView;
