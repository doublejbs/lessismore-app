import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Marker } from '@maplibre/maplibre-react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgType, Radius } from '@/constants/DesignTokens';
import MapPoint from '@/model/point/MapPoint';
import {
  getPointTypeColor,
  getPointTypeIcon,
  getPointTypeLabel,
} from '@/model/point/PointLabels';

interface Props {
  point: MapPoint;
  selected: boolean;
  // 보기 전용 지도(상세 지도 밴드, GRP-7)에서는 탭 대상이 밴드 전체라 넘기지 않는다.
  onTapPoint?: ((point: MapPoint) => void) | undefined;
  /**
   * 작은 지도용 마커 — 원을 줄이고 캡션을 뗀다(GRP-7 상세 지도 밴드). 높이 110pt 밴드에 캡션까지 달면
   * 포인트 몇 개로 지도가 글자에 덮인다. 이름은 누르고 들어간 그룹 지도가 보여준다.
   */
  compact?: boolean;
}

// 작은 마커도 잘 눌리도록 원(28pt)보다 넉넉한 탭 영역을 잡는다(HIG 44pt).
const HIT_AREA = 44;
const CIRCLE = 28;
const SELECTED_CIRCLE = 34;
const ICON = 15;
const SELECTED_ICON = 18;
const COMPACT_CIRCLE = 18;
const COMPACT_ICON = 10;
// 캡션 최대 폭(pt). 긴 이름이 지도를 가로지르지 않게 한 줄로 자른다.
const CAPTION_MAX_WIDTH = 140;
// 원(히트 영역)의 가운데가 좌표에 오게 한다 — 마커는 아래 가운데를 좌표에 두고 히트 영역 반만큼 내린다.
const MARKER_OFFSET: [number, number] = [0, HIT_AREA / 2];

/**
 * 지도 포인트 마커 1개 (MAP-2 · GRP-9 · BD-14 · OF-6). MapLibre `Marker`는 스냅숏이 아니라 실제 RN 뷰라
 * 캡션을 `PretendardText`로 직접 그린다. 유형색은 `PointLabels` 단일 소스다.
 *
 * 유형색 원 + 흰 테두리 + 아이콘, 이름은 원 위 캡션(잉크 글자 + 흰 반투명 바탕 — 지도 위 가독성).
 * 선택 마커는 원을 키우고 잉크 테두리. `compact`는 캡션 없는 작은 원이다(가운데가 좌표).
 */
const MapPointMarkerView = memo<Props>(
  ({ point, selected, onTapPoint, compact = false }) => {
    const color = getPointTypeColor(point.getType());
    const pressProps = onTapPoint ? { onPress: () => onTapPoint(point) } : {};

    if (compact) {
      return (
        <Marker
          id={`map-point-${point.getId()}`}
          lngLat={[point.getLongitude(), point.getLatitude()]}
          anchor='center'
          {...pressProps}
        >
          <View
            collapsable={false}
            style={[
              styles.circle,
              styles.circleCompact,
              {
                width: COMPACT_CIRCLE,
                height: COMPACT_CIRCLE,
                borderRadius: COMPACT_CIRCLE / 2,
                backgroundColor: color,
              },
            ]}
            accessible
            accessibilityLabel={`${getPointTypeLabel(point.getType())} ${point.getTitle()}`}
          >
            <Ionicons
              name={getPointTypeIcon(point.getType())}
              size={COMPACT_ICON}
              color={Acg.paper}
            />
          </View>
        </Marker>
      );
    }

    const size = selected ? SELECTED_CIRCLE : CIRCLE;

    return (
      <Marker
        id={`map-point-${point.getId()}`}
        lngLat={[point.getLongitude(), point.getLatitude()]}
        anchor='bottom'
        offset={MARKER_OFFSET}
        {...pressProps}
      >
        <View
          collapsable={false}
          style={styles.container}
          accessible
          {...(onTapPoint ? { accessibilityRole: 'button' as const } : {})}
          accessibilityLabel={`${getPointTypeLabel(point.getType())} ${point.getTitle()}`}
          accessibilityState={{ selected }}
        >
          <PretendardText
            weight={selected ? 'semibold' : 'medium'}
            style={styles.caption}
            numberOfLines={1}
          >
            {point.getTitle()}
          </PretendardText>
          <View style={styles.hitArea}>
            <View
              style={[
                styles.circle,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  backgroundColor: color,
                },
                selected && styles.circleSelected,
              ]}
            >
              <Ionicons
                name={getPointTypeIcon(point.getType())}
                size={selected ? SELECTED_ICON : ICON}
                color={Acg.paper}
              />
            </View>
          </View>
        </View>
      </Marker>
    );
  }
);

MapPointMarkerView.displayName = 'MapPointMarkerView';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  caption: {
    ...AcgType.meta,
    color: Acg.ink,
    maxWidth: CAPTION_MAX_WIDTH,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.pill,
    // 지도 위 캡션 바탕 — 거의 불투명한 흰 면(지형·라벨 위 가독성).
    backgroundColor: Acg.heroCardFill,
    overflow: 'hidden',
  },
  hitArea: {
    width: HIT_AREA,
    height: HIT_AREA,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Acg.paper,
  },
  circleCompact: {
    borderWidth: 1.5,
  },
  circleSelected: {
    borderWidth: 3,
    borderColor: Acg.ink,
  },
});

export default MapPointMarkerView;
