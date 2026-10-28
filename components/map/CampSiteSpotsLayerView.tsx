import { FC, useCallback, useMemo } from 'react';
import { NativeSyntheticEvent } from 'react-native';
import type {
  CircleLayerSpecification,
  SymbolLayerSpecification,
} from '@maplibre/maplibre-gl-style-spec';
import {
  GeoJSONSource,
  Layer,
  PressEventWithFeatures,
} from '@maplibre/maplibre-react-native';
import MapSpotPinMarkerView from '@/components/map/MapSpotPinMarkerView';
import { Acg } from '@/constants/DesignTokens';
import { getCampSiteTypeColor } from '@/model/camp-site/CampSiteLabels';
import { CampSpot } from '@/model/camp-site/CampSpotTypes';

interface Props {
  spots: readonly CampSpot[];
  selectedSpotId: string | null;
  onPressSpot?: (spot: CampSpot) => void;
}

const SOURCE_ID = 'app-camp-spots';
const DOT_LAYER_ID = 'app-camp-spots-dot';
const CAPTION_LAYER_ID = 'app-camp-spots-caption';
// 원형 도트 18pt(반지름 9) + 흰 2pt 테두리(CS-2). 채움은 유형 의미색.
const DOT_RADIUS = 9;
const DOT_STROKE_WIDTH = 2;
// 이름 캡션 — 도트 위, 잉크 글자 + 흰 halo(CS-2). 오프셋은 em 단위.
const CAPTION_SIZE = 12;
const CAPTION_HALO_WIDTH = 1.5;
const CAPTION_OFFSET: [number, number] = [0, -1.2];
// OpenFreeMap 글리프에 있는 폰트(스타일 `outdoor-v1.json` symbol 레이어와 같은 값). 한글은 기기 글꼴로 그린다.
const CAPTION_FONT = ['Noto Sans Regular'];

// 레이어 스타일은 모듈 상수다 — 렌더마다 새 객체를 넘기면 SDK가 네이티브로 다시 보낸다.
const DOT_PAINT: NonNullable<CircleLayerSpecification['paint']> = {
  'circle-radius': DOT_RADIUS,
  'circle-color': ['get', 'color'],
  'circle-stroke-color': Acg.paper,
  'circle-stroke-width': DOT_STROKE_WIDTH,
};
const CAPTION_LAYOUT: NonNullable<SymbolLayerSpecification['layout']> = {
  'text-field': ['get', 'title'],
  'text-size': CAPTION_SIZE,
  'text-font': CAPTION_FONT,
  'text-anchor': 'bottom',
  'text-offset': CAPTION_OFFSET,
  'text-allow-overlap': false,
};
const CAPTION_PAINT: NonNullable<SymbolLayerSpecification['paint']> = {
  'text-color': Acg.ink,
  'text-halo-color': Acg.paper,
  'text-halo-width': CAPTION_HALO_WIDTH,
};

/**
 * 박지 마커 수백 개 (MAP-2 · MAP-4 · CS-2) — `GeoJSONSource` + `circle`(유형색 도트) + `symbol`(이름 캡션).
 *
 * - 캡션은 심볼 배치가 충돌을 가린다(`text-allow-overlap=false` — 겹치면 **캡션만** 숨고 점은 남는다. 점은
 *   `circle` 레이어라 충돌 판정에 들지 않는다; `[이력]` 네이버 `isHideCollidedCaptions`에 해당). 뷰포트 밖 렌더
 *   제외는 엔진이 한다(수동 필터 없음).
 * - **선택 박지만 `Marker`**(`MapSpotPinMarkerView` — 라임 핀 + 캡션 강제 표시, 버튼). 선택이 바뀌어도 소스 데이터는 그대로 두고
 *   레이어 `filter`로 선택 박지만 뺀다 — 수백 개 피처를 다시 보내지 않는다.
 * - 탭: `GeoJSONSource.onPress`(44pt 히트박스 안 피처) → `id`로 박지를 찾는다. 지도 `onPress`(선택 해제)로
 *   번지지 않게 `stopPropagation`한다.
 */
const CampSiteSpotsLayerView: FC<Props> = ({
  spots,
  selectedSpotId,
  onPressSpot,
}) => {
  const spotsById = useMemo(() => {
    const byId = new Map<string, CampSpot>();

    spots.forEach(spot => byId.set(spot.id, spot));

    return byId;
  }, [spots]);

  // 객체를 넘기면 SDK가 렌더마다 `JSON.stringify`한다 — 박지 목록이 바뀔 때만 한 번 문자열로 바꾼다.
  const data = useMemo((): string => {
    const collection: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: spots.map(
        (spot): GeoJSON.Feature => ({
          type: 'Feature',
          id: spot.id,
          properties: {
            id: spot.id,
            title: spot.name,
            color: getCampSiteTypeColor(spot.type),
          },
          geometry: {
            type: 'Point',
            coordinates: [spot.location.longitude, spot.location.latitude],
          },
        })
      ),
    };

    return JSON.stringify(collection);
  }, [spots]);

  const handlePressSource = useCallback(
    (event: NativeSyntheticEvent<PressEventWithFeatures>) => {
      const spot = event.nativeEvent.features
        .map(feature => feature.properties?.id)
        .map(id => (typeof id === 'string' ? spotsById.get(id) : undefined))
        .find(item => item !== undefined);

      if (!spot || !onPressSpot) {
        return;
      }

      event.stopPropagation();
      onPressSpot(spot);
    },
    [onPressSpot, spotsById]
  );

  const selectedSpot = selectedSpotId
    ? (spotsById.get(selectedSpotId) ?? null)
    : null;
  const unselectedFilter = useMemo(
    (): ['!=', ['get', string], string] => [
      '!=',
      ['get', 'id'],
      selectedSpotId ?? '',
    ],
    [selectedSpotId]
  );

  return (
    <>
      <GeoJSONSource
        id={SOURCE_ID}
        data={data}
        {...(onPressSpot ? { onPress: handlePressSource } : {})}
      >
        <Layer
          id={DOT_LAYER_ID}
          type='circle'
          filter={unselectedFilter}
          paint={DOT_PAINT}
        />
        <Layer
          id={CAPTION_LAYER_ID}
          type='symbol'
          filter={unselectedFilter}
          layout={CAPTION_LAYOUT}
          paint={CAPTION_PAINT}
        />
      </GeoJSONSource>
      {selectedSpot ? (
        <MapSpotPinMarkerView
          key={selectedSpot.id}
          spot={selectedSpot}
          idPrefix='map-camp-spot-selected'
          selected
          {...(onPressSpot ? { onPress: () => onPressSpot(selectedSpot) } : {})}
        />
      ) : null}
    </>
  );
};

export default CampSiteSpotsLayerView;
