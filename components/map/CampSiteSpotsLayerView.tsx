import { FC, useCallback, useMemo } from 'react';
import { NativeSyntheticEvent, StyleSheet, View } from 'react-native';
import {
  GeoJSONSource,
  Layer,
  Marker,
  PressEventWithFeatures,
} from '@maplibre/maplibre-react-native';
import PretendardText from '@/components/PretendardText';
import SpotPinView from '@/components/camp-site/SpotPinView';
import { Acg, Radius } from '@/constants/DesignTokens';
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
// 선택 핀(CS-2) — 30×40, 끝점이 좌표. 캡션은 강제 표시 13pt.
const PIN_WIDTH = 30;
const SELECTED_CAPTION_SIZE = 13;
const SELECTED_CAPTION_LINE_HEIGHT = 17;
const SELECTED_CAPTION_MAX_WIDTH = 160;
const SELECTED_CAPTION_GAP = 2;

/**
 * 박지 마커 수백 개 (MAP-2 · MAP-4 · CS-2) — `GeoJSONSource` + `circle`(유형색 도트) + `symbol`(이름 캡션).
 *
 * - 캡션은 심볼 배치가 충돌을 가린다(`text-allow-overlap=false` + `text-optional` — 겹치면 **캡션만** 숨고
 *   점은 남는다; 네이버 `isHideCollidedCaptions`에 해당). 뷰포트 밖 렌더 제외는 엔진이 한다(수동 필터 없음).
 * - **선택 박지만 `Marker`**(라임 `SpotPinView` + 캡션 강제 표시). 선택이 바뀌어도 소스 데이터는 그대로 두고
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
  const unselectedFilter: ['!=', ['get', string], string] = [
    '!=',
    ['get', 'id'],
    selectedSpotId ?? '',
  ];

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
          paint={{
            'circle-radius': DOT_RADIUS,
            'circle-color': ['get', 'color'],
            'circle-stroke-color': Acg.paper,
            'circle-stroke-width': DOT_STROKE_WIDTH,
          }}
        />
        <Layer
          id={CAPTION_LAYER_ID}
          type='symbol'
          filter={unselectedFilter}
          layout={{
            'text-field': ['get', 'title'],
            'text-size': CAPTION_SIZE,
            'text-font': CAPTION_FONT,
            'text-anchor': 'bottom',
            'text-offset': CAPTION_OFFSET,
            'text-allow-overlap': false,
            'text-optional': true,
          }}
          paint={{
            'text-color': Acg.ink,
            'text-halo-color': Acg.paper,
            'text-halo-width': CAPTION_HALO_WIDTH,
          }}
        />
      </GeoJSONSource>
      {selectedSpot ? (
        <Marker
          key={selectedSpot.id}
          id={`map-camp-spot-selected-${selectedSpot.id}`}
          lngLat={[
            selectedSpot.location.longitude,
            selectedSpot.location.latitude,
          ]}
          anchor='bottom'
          {...(onPressSpot ? { onPress: () => onPressSpot(selectedSpot) } : {})}
        >
          <View
            collapsable={false}
            style={styles.selected}
            accessible
            accessibilityLabel={selectedSpot.name}
            accessibilityState={{ selected: true }}
          >
            <PretendardText
              weight='semibold'
              style={styles.selectedCaption}
              numberOfLines={1}
            >
              {selectedSpot.name}
            </PretendardText>
            <SpotPinView width={PIN_WIDTH} />
          </View>
        </Marker>
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  selected: {
    alignItems: 'center',
    gap: SELECTED_CAPTION_GAP,
  },
  selectedCaption: {
    fontSize: SELECTED_CAPTION_SIZE,
    lineHeight: SELECTED_CAPTION_LINE_HEIGHT,
    color: Acg.ink,
    maxWidth: SELECTED_CAPTION_MAX_WIDTH,
    paddingHorizontal: 6,
    borderRadius: Radius.pill,
    // 지도 위 캡션 바탕 — 비선택 캡션의 흰 halo와 같은 역할의 흰 반투명 면.
    backgroundColor: Acg.heroCardFill,
    overflow: 'hidden',
  },
});

export default CampSiteSpotsLayerView;
