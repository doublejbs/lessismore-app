import { FC } from 'react';
import MapPoint from '@/model/point/MapPoint';
import MapPointMarkerView from './MapPointMarkerView';

interface Props {
  points: readonly MapPoint[];
  selectedPointId: string | null;
  onTapPoint?: ((point: MapPoint) => void) | undefined;
  compact?: boolean;
}

/**
 * 지도 포인트 마커 목록 (MAP-2 · GRP-9 · BD-14). 수십 개 이하라 `Marker`(실제 RN 뷰)로 그린다.
 * 뷰포트 밖 컬링은 하지 않는다 — 네이티브가 화면 밖 마커를 그리지 않는다.
 */
const MapPointMarkersView: FC<Props> = ({
  points,
  selectedPointId,
  onTapPoint,
  compact = false,
}) => {
  return (
    <>
      {points.map(point => (
        <MapPointMarkerView
          key={point.getId()}
          point={point}
          selected={point.getId() === selectedPointId}
          onTapPoint={onTapPoint}
          compact={compact}
        />
      ))}
    </>
  );
};

export default MapPointMarkersView;
