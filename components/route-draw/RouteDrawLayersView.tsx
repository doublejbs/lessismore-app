import { FC, useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import type {
  CircleLayerSpecification,
  LineLayerSpecification,
} from '@maplibre/maplibre-gl-style-spec';
import { GeoJSONSource, Layer, Marker } from '@maplibre/maplibre-react-native';
import { observer } from 'mobx-react-lite';
import { ROUTE_CASING_COLOR } from '@/components/map/MapConstants';
import { Acg } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import RouteDraw from '@/model/route-draw/RouteDraw';
import { RouteDrawSegment } from '@/model/route-draw/RouteDrawSegment';
import { ROUTE_COLOR } from '@/model/route/RouteColors';
import { ROUTE_ENDPOINT_LABELS } from '@/model/route/RouteEndpointLabels';

interface Props {
  routeDraw: RouteDraw;
}

const LINE_SOURCE_ID = 'route-draw-line';
const LINE_CASING_LAYER_ID = 'route-draw-line-casing';
const LINE_LAYER_ID = 'route-draw-line-main';
const PENDING_SOURCE_ID = 'route-draw-pending';
const PENDING_LAYER_ID = 'route-draw-pending-line';
const POINT_SOURCE_ID = 'route-draw-points';
const POINT_LAYER_ID = 'route-draw-points-circle';
// 선은 기존 코스의 **선택** 굵기와 같다(본선 6 + 양쪽 흰 테두리 2) — 가져온 코스와 다르게 보일 이유가 없다(RD-2).
const LINE_WIDTH = 6;
const LINE_OUTLINE_WIDTH = 10;
// 점: 지름 14(반지름 7) + 흰 테두리 2.
const POINT_RADIUS = 7;
const POINT_STROKE_WIDTH = 2;
// 길 찾는 중인 구간(RD-6): 회색 점선 직선 — 완료된 선보다 가늘게, 대시는 선 굵기 단위다.
const PENDING_LINE_WIDTH = 4;
const PENDING_DASH: number[] = [2, 1.5];

// 레이어 스타일은 모듈 상수다 — 렌더마다 새 객체를 넘기면 SDK가 네이티브로 다시 보낸다.
const LINE_LAYOUT: NonNullable<LineLayerSpecification['layout']> = {
  'line-cap': 'round',
  'line-join': 'round',
};
// 점선은 끝을 자른다 — 둥근 끝은 대시마다 반 굵기씩 늘어나 틈을 메운다.
const PENDING_LAYOUT: NonNullable<LineLayerSpecification['layout']> = {
  'line-cap': 'butt',
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
const PENDING_PAINT: NonNullable<LineLayerSpecification['paint']> = {
  'line-color': Acg.textMuted,
  'line-width': PENDING_LINE_WIDTH,
  'line-dasharray': PENDING_DASH,
};
const POINT_PAINT: NonNullable<CircleLayerSpecification['paint']> = {
  'circle-radius': POINT_RADIUS,
  'circle-color': ROUTE_COLOR,
  'circle-stroke-color': ROUTE_CASING_COLOR,
  'circle-stroke-width': POINT_STROKE_WIDTH,
};

type LineCoordinates = number[][];

const toLineCoordinates = (segment: RouteDrawSegment): LineCoordinates =>
  segment.coordinates.map(coordinate => [coordinate.lng, coordinate.lat]);

/**
 * 완료 구간은 이어진 것끼리 한 줄로 묶는다(이음매에서 둥근 끝이 겹쳐 보이지 않게), 대기 구간은 각각 한 줄이다.
 * 대기 구간이 가운데 낄 수 있다 — 켬으로 찍은 구간이 기다리는 동안 끄고 찍으면 뒤 구간이 먼저 확정된다.
 */
const splitSegmentLines = (
  segments: readonly RouteDrawSegment[]
): { done: LineCoordinates[]; pending: LineCoordinates[] } => {
  const done: LineCoordinates[] = [];
  const pending: LineCoordinates[] = [];
  let run: LineCoordinates | null = null;

  segments.forEach(segment => {
    const line = toLineCoordinates(segment);

    if (segment.pending) {
      pending.push(line);
      run = null;

      return;
    }

    if (run) {
      // 앞 구간 끝 = 이 구간 첫 좌표(찍은 점)라 겹치는 한 점은 뺀다.
      run.push(...line.slice(1));

      return;
    }

    run = [...line];
    done.push(run);
  });

  return { done, pending };
};

const toLineCollection = (lines: readonly LineCoordinates[]): string => {
  const collection: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: lines.map(coordinates => ({
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates },
    })),
  };

  return JSON.stringify(collection);
};

/**
 * 그리는 코스 (RD-2 · RD-6) — 지도 children. 구간 좌표를 이은 선(파랑 + 흰 테두리, 코스 선과 같은 문법 — 길 따라·직선을
 * 구분하지 않는다) · 길 찾는 중인 구간(회색 점선) · 찍은 점(파랑 원 + 흰 테두리) ·
 * 첫 점 `출발`, (2점 이상) 마지막 점 `도착` 말풍선(끝점 마커 `MapEndpointMarkersView`와 같은 이미지).
 * 소스는 점이 없어도 붙여 둔다(빈 컬렉션) — 붙였다 뗐다 하면 네이티브가 레이어를 다시 만든다.
 * 누를 수 있는 것이 없다 — 이 모드의 지도 탭은 전부 점 추가다.
 */
const RouteDrawLayersView: FC<Props> = ({ routeDraw }) => {
  const segments = routeDraw.getSegments();
  const points = routeDraw.getPoints();
  // 구간 배열은 확정될 때마다 새로 만들어진다 — 모양(좌표 수·대기 여부·끝 좌표)이 같으면 같은 선이다.
  const segmentsKey = segments
    .map(segment => {
      const last = segment.coordinates[segment.coordinates.length - 1];

      return `${segment.id}:${segment.pending ? 1 : 0}:${segment.coordinates.length}:${last.lng},${last.lat}`;
    })
    .join('|');
  const pointsKey = points
    .map(point => `${point.longitude},${point.latitude}`)
    .join('|');

  // 객체를 넘기면 SDK가 렌더마다 `JSON.stringify`한다 — 구간이 바뀔 때만 한 번 문자열로 바꾼다.
  const { lineData, pendingData } = useMemo(() => {
    const lines = splitSegmentLines(segments);

    return {
      lineData: toLineCollection(lines.done),
      pendingData: toLineCollection(lines.pending),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 키가 같으면 같은 구간들이다.
  }, [segmentsKey]);
  const pointData = useMemo((): string => {
    const collection: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: points.map(point => ({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Point',
          coordinates: [point.longitude, point.latitude],
        },
      })),
    };

    return JSON.stringify(collection);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 키가 같으면 같은 점들이다.
  }, [pointsKey]);

  const l10n = app.getL10n();
  const labels = ROUTE_ENDPOINT_LABELS[l10n.language];
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
      <GeoJSONSource id={PENDING_SOURCE_ID} data={pendingData}>
        <Layer
          id={PENDING_LAYER_ID}
          type='line'
          layout={PENDING_LAYOUT}
          paint={PENDING_PAINT}
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
