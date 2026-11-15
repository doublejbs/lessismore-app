import { FC, memo, useMemo } from 'react';
import { GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';

interface Props {
  // 저장해 둔 등고선(OF-6 `contours.json`). 한 번 읽어 바뀌지 않는다.
  contours: GeoJSON.FeatureCollection;
  // 등고선을 이 레이어 아래에 끼운다(코스 테두리 — 등고선은 코스보다 늦게 붙는다).
  beforeId: string;
}

// 등고선 색 — 지형도 관례의 옅은 갈색(데이터 시각화 색). 100m마다 굵게 + 고도 라벨.
const CONTOUR_MINOR_COLOR = 'rgba(140, 100, 60, 0.35)';
const CONTOUR_MAJOR_COLOR = 'rgba(140, 100, 60, 0.6)';
const CONTOUR_LABEL_COLOR = 'rgba(110, 80, 50, 0.9)';
const CONTOUR_LABEL_HALO = '#FFFFFF';
const CONTOUR_MINOR_WIDTH = 0.8;
const CONTOUR_MAJOR_WIDTH = 1.4;
const CONTOUR_LABEL_SIZE = 10;
// 줌별 투명도 — 넓게 볼 때(줌 11 아래)는 20m 간격 선이 겹쳐 갈색 덩어리가 된다(2026-10-12 실기기 실측).
// 100m 선은 줌 11부터, 20m 선은 줌 12.5부터 서서히 드러나고, 라벨은 줌 13부터다.
const CONTOUR_MINOR_OPACITY: unknown[] = ['interpolate', ['linear'], ['zoom'], 12, 0, 13.5, 1];
const CONTOUR_MAJOR_OPACITY: unknown[] = ['interpolate', ['linear'], ['zoom'], 10.5, 0, 12.5, 1];
const CONTOUR_MINOR_MINZOOM = 12;
const CONTOUR_MAJOR_MINZOOM = 10.5;
const CONTOUR_LABEL_MINZOOM = 13;
// OpenFreeMap 글리프에 있는 폰트(스타일 `outdoor-v1.json`의 symbol 레이어와 같은 값).
const CONTOUR_LABEL_FONT = ['Noto Sans Regular'];

/**
 * 오프라인 지도의 등고선 레이어 (OF-6). 수십만 점짜리 컬렉션이라 **따로 memo한다** — 나침반·훑기·내 위치로
 * 부모가 리렌더돼도 다시 그리지 않고, `data`는 한 번만 문자열로 바꿔 넘긴다(SDK는 객체를 받으면 렌더마다
 * `JSON.stringify`한다).
 */
const OfflineMapContoursView: FC<Props> = ({ contours, beforeId }) => {
  const data = useMemo(() => JSON.stringify(contours), [contours]);

  return (
    <GeoJSONSource id='offline-contours' data={data}>
      <Layer
        id='offline-contours-minor'
        type='line'
        beforeId={beforeId}
        minzoom={CONTOUR_MINOR_MINZOOM}
        paint={{
          'line-color': CONTOUR_MINOR_COLOR,
          'line-width': CONTOUR_MINOR_WIDTH,
          'line-opacity': CONTOUR_MINOR_OPACITY as never,
        }}
      />
      <Layer
        id='offline-contours-major'
        type='line'
        beforeId={beforeId}
        minzoom={CONTOUR_MAJOR_MINZOOM}
        filter={['==', ['get', 'major'], true]}
        paint={{
          'line-color': CONTOUR_MAJOR_COLOR,
          'line-width': CONTOUR_MAJOR_WIDTH,
          'line-opacity': CONTOUR_MAJOR_OPACITY as never,
        }}
      />
      <Layer
        id='offline-contours-label'
        type='symbol'
        beforeId={beforeId}
        minzoom={CONTOUR_LABEL_MINZOOM}
        filter={['==', ['get', 'major'], true]}
        layout={{
          'symbol-placement': 'line',
          'text-field': ['to-string', ['get', 'ele']],
          'text-size': CONTOUR_LABEL_SIZE,
          'text-font': CONTOUR_LABEL_FONT,
        }}
        paint={{
          'text-color': CONTOUR_LABEL_COLOR,
          'text-halo-color': CONTOUR_LABEL_HALO,
          'text-halo-width': 1,
        }}
      />
    </GeoJSONSource>
  );
};

export default memo(OfflineMapContoursView);
