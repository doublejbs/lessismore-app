import { FC, useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import type {
  CircleLayerSpecification,
  LineLayerSpecification,
} from '@maplibre/maplibre-gl-style-spec';
import { GeoJSONSource, Layer, Marker } from '@maplibre/maplibre-react-native';
import { observer } from 'mobx-react-lite';
import { ROUTE_CASING_COLOR } from '@/components/map/MapConstants';
import app from '@/model/app/App';
import RouteDraw from '@/model/route-draw/RouteDraw';
import { ROUTE_COLOR } from '@/model/route/RouteColors';
import { ROUTE_ENDPOINT_LABELS } from '@/model/route/RouteEndpointLabels';

interface Props {
  routeDraw: RouteDraw;
}

const LINE_SOURCE_ID = 'route-draw-line';
const LINE_CASING_LAYER_ID = 'route-draw-line-casing';
const LINE_LAYER_ID = 'route-draw-line-main';
const POINT_SOURCE_ID = 'route-draw-points';
const POINT_LAYER_ID = 'route-draw-points-circle';
// 선은 기존 코스의 **선택** 굵기와 같다(본선 6 + 양쪽 흰 테두리 2) — 가져온 코스와 다르게 보일 이유가 없다(RD-2).
const LINE_WIDTH = 6;
const LINE_OUTLINE_WIDTH = 10;
// 점: 지름 14(반지름 7) + 흰 테두리 2.
const POINT_RADIUS = 7;
const POINT_STROKE_WIDTH = 2;

// 레이어 스타일은 모듈 상수다 — 렌더마다 새 객체를 넘기면 SDK가 네이티브로 다시 보낸다.
const LINE_LAYOUT: NonNullable<LineLayerSpecification['layout']> = {
  'line-cap': 'round',
  'line-join': 'round',
};
const CASING_PAINT: NonNullable<LineLayerSpecification['paint']> = {
  'line-color': ROUTE_CASING_COLOR,
  'line-width': LINE_OUTLINE_WIDTH,
};
const LINE_PAINT: NonNullable<LineLayerSpecification['paint']> = {
  'line-color': ROUTE_COLOR,
  'line-width': LINE_WIDTH,
};
const POINT_PAINT: NonNullable<CircleLayerSpecification['paint']> = {
  'circle-radius': POINT_RADIUS,
  'circle-color': ROUTE_COLOR,
  'circle-stroke-color': ROUTE_CASING_COLOR,
  'circle-stroke-width': POINT_STROKE_WIDTH,
};

/**
 * 그리는 코스 (RD-2) — 지도 children. 선(파랑 + 흰 테두리, 코스 선과 같은 문법) · 찍은 점(파랑 원 + 흰 테두리) ·
 * 첫 점 `출발`, (2점 이상) 마지막 점 `도착` 말풍선(끝점 마커 `MapEndpointMarkersView`와 같은 이미지).
 * 소스는 점이 없어도 붙여 둔다(빈 컬렉션) — 붙였다 뗐다 하면 네이티브가 레이어를 다시 만든다.
 * 누를 수 있는 것이 없다 — 이 모드의 지도 탭은 전부 점 추가다.
 */
const RouteDrawLayersView: FC<Props> = ({ routeDraw }) => {
  const coordinates = routeDraw.getLineCoordinates();
  const coordinatesKey = coordinates.map(item => item.join(',')).join('|');

  // 객체를 넘기면 SDK가 렌더마다 `JSON.stringify`한다 — 점이 바뀔 때만 한 번 문자열로 바꾼다.
  const lineData = useMemo((): string => {
    const collection: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features:
        coordinates.length >= 2
          ? [
              {
                type: 'Feature',
                properties: {},
                geometry: { type: 'LineString', coordinates },
              },
            ]
          : [],
    };

    return JSON.stringify(collection);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 키가 같으면 같은 점들이다.
  }, [coordinatesKey]);
  const pointData = useMemo((): string => {
    const collection: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: coordinates.map(coordinate => ({
        type: 'Feature',
        properties: {},
        geometry: { type: 'Point', coordinates: coordinate },
      })),
    };

    return JSON.stringify(collection);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 키가 같으면 같은 점들이다.
  }, [coordinatesKey]);

  const l10n = app.getL10n();
  const labels = ROUTE_ENDPOINT_LABELS[l10n.language];
  const points = routeDraw.getPoints();
  const start = points[0] ?? null;
  const end = points.length >= 2 ? points[points.length - 1] : null;

  return (
    <>
      <GeoJSONSource id={LINE_SOURCE_ID} data={lineData}>
        <Layer
          id={LINE_CASING_LAYER_ID}
          type='line'
          layout={LINE_LAYOUT}
          paint={CASING_PAINT}
        />
        <Layer
          id={LINE_LAYER_ID}
          type='line'
          layout={LINE_LAYOUT}
          paint={LINE_PAINT}
        />
      </GeoJSONSource>
      <GeoJSONSource id={POINT_SOURCE_ID} data={pointData}>
        <Layer id={POINT_LAYER_ID} type='circle' paint={POINT_PAINT} />
      </GeoJSONSource>
      {/* 끝을 먼저 그려 두 끝이 겹치면 시작이 위에 온다(끝점 마커와 같은 규칙). 끝점은 점이 바뀌면 새로 붙인다. */}
      {end ? (
        <Marker
          key={`route-draw-end:${points.length}:${end.longitude},${end.latitude}`}
          id='route-draw-end'
          lngLat={[end.longitude, end.latitude]}
          anchor='bottom'
        >
          {/* 말풍선이 터치를 가로채지 않게 — 이 모드의 지도 탭은 전부 점 추가다(RD-2). */}
          <View collapsable={false} pointerEvents='none'>
            <Image
              source={labels.end.source}
              style={[
                styles.label,
                { width: labels.end.width, height: labels.end.height },
              ]}
              accessible
              accessibilityRole='image'
              accessibilityLabel={l10n.t('route.endpoint.end')}
            />
          </View>
        </Marker>
      ) : null}
      {start ? (
        <Marker
          key={`route-draw-start:${start.longitude},${start.latitude}`}
          id='route-draw-start'
          lngLat={[start.longitude, start.latitude]}
          anchor='bottom'
        >
          {/* 말풍선이 터치를 가로채지 않게 — 이 모드의 지도 탭은 전부 점 추가다(RD-2). */}
          <View collapsable={false} pointerEvents='none'>
            <Image
              source={labels.start.source}
              style={[
                styles.label,
                { width: labels.start.width, height: labels.start.height },
              ]}
              accessible
              accessibilityRole='image'
              accessibilityLabel={l10n.t('route.endpoint.start')}
            />
          </View>
        </Marker>
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  label: {
    resizeMode: 'contain',
  },
});

export default observer(RouteDrawLayersView);
