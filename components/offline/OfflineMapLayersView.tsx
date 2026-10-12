import { FC, useMemo } from 'react';
import { GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';
import { observer } from 'mobx-react-lite';
import { BagRouteEntry } from '@/model/bag-route/BagRouteEntry';
import { ROUTE_COLOR, ROUTE_DIM_COLOR } from '@/model/route/RouteColors';
import OfflineMapContoursView from './OfflineMapContoursView';

interface Props {
  // 부모가 안정 키(`getOfflineRouteEntriesKey`)로 memo해 넘긴다 — 키가 같으면 같은 배열이다.
  entries: readonly BagRouteEntry[];
  selectedKey: string | null;
  // 저장해 둔 등고선(OF-6 `contours.json`). 없으면(계산 실패·구버전·폴백) 등고선 레이어를 그리지 않는다.
  contours: GeoJSON.FeatureCollection | null;
}

// 코스 폴리라인 색은 `RouteColors`, 굵기는 네이버 지도의 `RoutePathOverlayView`와 같은 값.
const ROUTE_OUTLINE_COLOR = '#FFFFFF';
const ROUTE_WIDTH = 6;
const ROUTE_DIM_WIDTH = 4;
const ROUTE_OUTLINE_WIDTH = 10;
const ROUTE_DIM_OUTLINE_WIDTH = 6;
// 등고선 레이어를 코스 테두리 아래에 끼운다 — 등고선은 저장본을 비동기로 읽어 코스보다 늦게 붙는다.
const OFFLINE_ROUTE_CASING_LAYER_ID = 'offline-routes-casing';
// 경로선은 좌표가 2개 미만이면 그리지 않는다(네이버 지도 경로선과 같은 규칙).
const MIN_PATH_COORDS = 2;

/**
 * 코스 목록의 안정 키 — 항목 키·좌표 수·방향이 같으면 같은 선이다. 부모가 이 키로 `entries`를 memo해
 * 넘겨, 나침반·훑기·내 위치 갱신으로 부모가 리렌더돼도 선 레이어가 다시 그려지지 않게 한다.
 */
export const getOfflineRouteEntriesKey = (
  entries: readonly BagRouteEntry[]
): string =>
  entries
    .map(
      entry =>
        `${entry.key}:${entry.route.getSimplified().length}:${entry.route.isReversed() ? 'r' : 'f'}`
    )
    .join('|');

/**
 * 오프라인 코스 지도의 선 레이어 (OF-6) — 아래부터 ① 등고선(음영 위) ② 코스 테두리 ③ 코스 본선.
 * 마커(시작·끝·포인트·훑기·내 위치)는 이 위에 `Marker`로 따로 그린다.
 *
 * 코스 소스는 늘 붙여 둔다(빈 컬렉션이라도) — 등고선이 그 아래로 끼어들 기준 레이어가 되기 때문이다.
 * 선택 코스가 위에 오도록 선택 코스를 컬렉션 맨 뒤에 둔다. 코스가 하나뿐이면 선택으로 친다(GRP-10).
 */
const OfflineMapLayersView: FC<Props> = ({
  entries,
  selectedKey,
  contours,
}) => {
  // 객체를 넘기면 SDK가 렌더마다 `JSON.stringify`한다 — 한 번만 문자열로 바꾼다.
  const routeData = useMemo((): string => {
    const features = entries
      .map(entry => {
        const coordinates = entry.route
          .getSimplified()
          .map(coordinate => [coordinate.lng, coordinate.lat]);
        const selected = entries.length === 1 || entry.key === selectedKey;

        return { entry, coordinates, selected };
      })
      .filter(item => item.coordinates.length >= MIN_PATH_COORDS)
      .sort((a, b) => Number(a.selected) - Number(b.selected))
      .map((item): GeoJSON.Feature => ({
        type: 'Feature',
        properties: { id: item.entry.key, selected: item.selected },
        geometry: { type: 'LineString', coordinates: item.coordinates },
      }));

    const collection: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features,
    };

    return JSON.stringify(collection);
  }, [entries, selectedKey]);

  return (
    <>
      <GeoJSONSource id='offline-routes' data={routeData}>
        <Layer
          id={OFFLINE_ROUTE_CASING_LAYER_ID}
          type='line'
          layout={{ 'line-cap': 'round', 'line-join': 'round' }}
          paint={{
            'line-color': ROUTE_OUTLINE_COLOR,
            'line-width': [
              'case',
              ['get', 'selected'],
              ROUTE_OUTLINE_WIDTH,
              ROUTE_DIM_OUTLINE_WIDTH,
            ],
          }}
        />
        <Layer
          id='offline-routes-line'
          type='line'
          layout={{ 'line-cap': 'round', 'line-join': 'round' }}
          paint={{
            'line-color': [
              'case',
              ['get', 'selected'],
              ROUTE_COLOR,
              ROUTE_DIM_COLOR,
            ],
            'line-width': [
              'case',
              ['get', 'selected'],
              ROUTE_WIDTH,
              ROUTE_DIM_WIDTH,
            ],
          }}
        />
      </GeoJSONSource>
      {contours ? (
        <OfflineMapContoursView
          contours={contours}
          beforeId={OFFLINE_ROUTE_CASING_LAYER_ID}
        />
      ) : null}
    </>
  );
};

export default observer(OfflineMapLayersView);
