import { FC, useMemo } from 'react';
import { GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';
import { observer } from 'mobx-react-lite';
import { ROUTE_COLOR, ROUTE_DIM_COLOR } from '@/model/route/RouteColors';
import { RouteDisplay } from '@/model/route/RouteDisplay';

interface Props {
  routes: readonly RouteDisplay[];
  // 굵게 그릴 코스(`RouteDisplay.getId()`). 코스가 하나뿐이면 선택 없이도 그 코스가 주인공이다(GRP-10).
  selectedRouteId: string | null;
  /**
   * 모든 코스를 선택된 굵기로 그린다 — 그룹 상세 지도 밴드처럼 선택 개념이 없는 보기 전용 지도(GRP-7).
   * 옅게 그린 선은 "고르지 않은 코스"라는 뜻인데, 고를 수 없는 곳에서는 그 구분이 말하는 것이 없다.
   */
  uniform?: boolean;
  // 코스 선을 이 레이어 아래에 끼운다(예: 박지 점 레이어). 없으면 맨 위에 붙는다.
  beforeId?: string;
}

/**
 * 코스 테두리 레이어 id — 등고선(OF-6)처럼 코스 **아래**에 깔아야 하는 레이어가 `beforeId`로 쓴다.
 * 한 지도에 이 뷰는 하나만 둔다(소스·레이어 id가 고정이다).
 */
export const ROUTE_CASING_LAYER_ID = 'app-routes-casing';

const ROUTE_SOURCE_ID = 'app-routes';
const ROUTE_LINE_LAYER_ID = 'app-routes-line';
// 코스 선 색은 `RouteColors`(고도 그래프·리플레이와 같은 파랑). 선택 6 / 비선택 4, 흰 테두리.
const ROUTE_OUTLINE_COLOR = '#FFFFFF';
const ROUTE_WIDTH = 6;
const ROUTE_DIM_WIDTH = 4;
// 테두리 레이어 굵기 = 본선 + 양쪽 2pt.
const ROUTE_OUTLINE_WIDTH = 10;
const ROUTE_DIM_OUTLINE_WIDTH = 6;
// 경로선은 좌표가 2개 미만이면 그리지 않는다.
const MIN_PATH_COORDS = 2;

/**
 * 코스 목록의 안정 키 — id·좌표 수·방향이 같으면 같은 선이다. 이 키로 GeoJSON 문자열을 memo해, 나침반·
 * 훑기·내 위치 갱신으로 부모가 리렌더돼도(호출부의 `routes`는 렌더마다 새 배열이다) 선을 다시 보내지 않는다.
 */
const getRoutesKey = (routes: readonly RouteDisplay[]): string =>
  routes
    .map(
      route =>
        `${route.getId()}:${route.getSimplified().length}:${route.isReversed() ? 'r' : 'f'}`
    )
    .join('|');

/**
 * 지도 위 코스 선 (MAP-2 · GRP-8 · GRP-10 · BD-11 · OF-6) — `GeoJSONSource` + 선 레이어 둘(① 흰 테두리 ② 본선).
 * 그룹 지도·배낭 코스(온라인·오프라인)·밴드가 **같은 선**을 그린다 — 선 굵기·색·강조 규칙이 한 곳에 있다.
 *
 * - 선택 코스가 위에 오도록 컬렉션 맨 뒤에 둔다. 코스가 하나뿐이거나 `uniform`이면 모두 선택으로 친다.
 * - 소스는 코스가 없어도 늘 붙여 둔다(빈 컬렉션) — 등고선이 그 아래로 끼어들 기준 레이어가 된다.
 * - observer다 — 좌표는 **지금 보는 방향** 순서라(GRP-8 뒤집기) 방향이 바뀌면 키가 바뀌어 다시 그린다.
 */
const MapRoutePathLayersView: FC<Props> = ({
  routes,
  selectedRouteId,
  uniform = false,
  beforeId,
}) => {
  const routesKey = getRoutesKey(routes);

  // 객체를 넘기면 SDK가 렌더마다 `JSON.stringify`한다 — 키가 바뀔 때만 한 번 문자열로 바꾼다.
  const data = useMemo((): string => {
    const features = routes
      .map(route => {
        const coordinates = route
          .getSimplified()
          .map(coordinate => [coordinate.lng, coordinate.lat]);
        const selected =
          uniform || routes.length === 1 || route.getId() === selectedRouteId;

        return { id: route.getId(), coordinates, selected };
      })
      .filter(item => item.coordinates.length >= MIN_PATH_COORDS)
      .sort((a, b) => Number(a.selected) - Number(b.selected))
      .map(
        (item): GeoJSON.Feature => ({
          type: 'Feature',
          properties: { id: item.id, selected: item.selected },
          geometry: { type: 'LineString', coordinates: item.coordinates },
        })
      );
    const collection: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features,
    };

    return JSON.stringify(collection);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 키가 같으면 같은 선이다(키에 id·좌표 수·방향 포함).
  }, [routesKey, selectedRouteId, uniform]);

  return (
    <GeoJSONSource id={ROUTE_SOURCE_ID} data={data}>
      <Layer
        id={ROUTE_CASING_LAYER_ID}
        type='line'
        {...(beforeId ? { beforeId } : {})}
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
        id={ROUTE_LINE_LAYER_ID}
        type='line'
        {...(beforeId ? { beforeId } : {})}
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
  );
};

export default observer(MapRoutePathLayersView);
