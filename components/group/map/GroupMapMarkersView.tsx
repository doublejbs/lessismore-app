import { FC } from 'react';
import { Dimensions } from 'react-native';
import { observer } from 'mobx-react-lite';
import GroupPoint from '@/model/group/GroupPoint';
import GroupPointList from '@/model/group-point/GroupPointList';
import { zoomToDelta } from '@/model/map/MapZoom';
import GroupPointMarkerView from './GroupPointMarkerView';

// 지도 카메라의 양자화된 뷰포트 상태(GroupMapCanvasView가 onCameraChanged에서 만든다).
export interface GroupMapViewport {
  latitude: number;
  longitude: number;
  zoom: number;
}

interface Props {
  pointList: GroupPointList;
  viewport: GroupMapViewport | null;
  selectedPointId: string | null;
  onTapPoint: (point: GroupPoint) => void;
}

/**
 * 포인트 마커 레이어 (GRP-9 · GRP-10).
 *
 * 박지 지도(CS-2)와 같은 처리다 — **뷰포트 밖 마커는 그리지 않고**, 겹침은 캡션 숨김이
 * 맡는다. 지도 화면에서 분리된 observer라 카메라 이동과 포인트·필터 변경에만 리렌더된다.
 */
const GroupMapMarkersView: FC<Props> = observer(
  ({ pointList, viewport, selectedPointId, onTapPoint }) => {
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
    const points = pointList
      .getVisiblePoints()
      .filter(
        point =>
          point.getLatitude() >= minLatitude &&
          point.getLatitude() <= maxLatitude &&
          point.getLongitude() >= minLongitude &&
          point.getLongitude() <= maxLongitude
      );

    return (
      <>
        {points.map(point => (
          <GroupPointMarkerView
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

export default GroupMapMarkersView;
