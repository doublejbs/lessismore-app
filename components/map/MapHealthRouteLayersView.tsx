import { FC, useMemo } from 'react';
import { GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';
import { ROUTE_COLOR } from '@/model/route/RouteColors';

export interface MapHealthRouteLine {
  id: string;
  // `[lng, lat]` 순서(MapLibre).
  coordinates: [number, number][];
}

interface Props {
  // 그릴 선. 좌표가 바뀔 때만 새 배열을 넘긴다(호출부가 memo한다 — 여기서 그 참조로 GeoJSON을 memo한다).
  lines: readonly MapHealthRouteLine[];
}

const SOURCE_ID = 'app-health-routes';
const CASING_LAYER_ID = 'app-health-routes-casing';
const LINE_LAYER_ID = 'app-health-routes-line';
// 운동 기록 경로(HA-4) — 코스 화면과 같은 파랑, 굵기 5 + 흰 테두리 2.
const OUTLINE_COLOR = '#FFFFFF';
const LINE_WIDTH = 5;
const OUTLINE_WIDTH = 2;
const MIN_PATH_COORDS = 2;

/**
 * 운동 기록 GPS 경로 선 (MAP-2 · HA-4) — `GeoJSONSource` + 선 레이어 둘(흰 테두리 · 본선).
 * 코스 선(`MapRoutePathLayersView`)은 `RouteDisplay`(축약 코스 모델)를 받고 선택 강조가 있다 — 운동 기록은
 * 원시 좌표 한 벌에 강조가 없어 따로 둔다. 한 지도에 이 뷰는 하나만 둔다(소스·레이어 id가 고정이다).
 */
const MapHealthRouteLayersView: FC<Props> = ({ lines }) => {
  // 객체를 넘기면 SDK가 렌더마다 `JSON.stringify`한다 — 선이 바뀔 때만 한 번 문자열로 바꾼다.
  const data = useMemo((): string => {
    const collection: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: lines
        .filter(line => line.coordinates.length >= MIN_PATH_COORDS)
        .map(
          (line): GeoJSON.Feature => ({
            type: 'Feature',
            properties: { id: line.id },
            geometry: { type: 'LineString', coordinates: line.coordinates },
          })
        ),
    };

    return JSON.stringify(collection);
  }, [lines]);

  return (
    <GeoJSONSource id={SOURCE_ID} data={data}>
      <Layer
        id={CASING_LAYER_ID}
        type='line'
        layout={{ 'line-cap': 'round', 'line-join': 'round' }}
        paint={{
          'line-color': OUTLINE_COLOR,
          'line-width': LINE_WIDTH + OUTLINE_WIDTH * 2,
        }}
      />
      <Layer
        id={LINE_LAYER_ID}
        type='line'
        layout={{ 'line-cap': 'round', 'line-join': 'round' }}
        paint={{
          'line-color': ROUTE_COLOR,
          'line-width': LINE_WIDTH,
        }}
      />
    </GeoJSONSource>
  );
};

export default MapHealthRouteLayersView;
