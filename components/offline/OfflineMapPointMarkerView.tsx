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
  onPress: (point: MapPoint) => void;
}

// 지도 포인트 마커(PointMarkerView)와 같은 치수 — 유형색 원 + 흰 테두리, 선택은 크게 + 잉크 테두리.
const HIT_AREA = 44;
const CIRCLE = 28;
const SELECTED_CIRCLE = 34;
// 캡션 최대 폭(pt). 긴 이름이 지도를 가로지르지 않게 한 줄로 자른다.
const CAPTION_MAX_WIDTH = 140;
// 원(히트 영역)의 가운데가 좌표에 오게 한다 — 마커는 아래 가운데를 좌표에 두고 히트 영역 반만큼 내린다.
const MARKER_OFFSET: [number, number] = [0, HIT_AREA / 2];

/**
 * 오프라인 코스 지도의 포인트 마커 (OF-6 · BD-14). MapLibre `Marker`는 실제 RN 뷰라(네이버 마커처럼
 * 스냅숏으로 굳히지 않는다) 캡션을 `PretendardText`로 직접 그린다. 유형색은 `PointLabels` 단일 소스다.
 *
 * 생김새는 네이버 지도의 `PointMarkerView`와 같다 — 유형색 원 + 흰 테두리 + 아이콘, 이름은 원 위 캡션
 * (잉크 글자 + 흰 바탕 — 네이버 캡션의 흰 halo를 대신한다). 선택 마커는 원을 키우고 잉크 테두리.
 */
const OfflineMapPointMarkerView = memo<Props>(
  ({ point, selected, onPress }) => {
    const color = getPointTypeColor(point.getType());
    const size = selected ? SELECTED_CIRCLE : CIRCLE;

    return (
      <Marker
        id={`offline-point-${point.getId()}`}
        lngLat={[point.getLongitude(), point.getLatitude()]}
        anchor='bottom'
        offset={MARKER_OFFSET}
        onPress={() => onPress(point)}
      >
        <View
          collapsable={false}
          style={styles.container}
          accessible
          accessibilityRole='button'
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
                size={selected ? 18 : 15}
                color={Acg.paper}
              />
            </View>
          </View>
        </View>
      </Marker>
    );
  }
);

OfflineMapPointMarkerView.displayName = 'OfflineMapPointMarkerView';

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
    // 지도 위 캡션 바탕 — 거의 불투명한 흰 면(네이버 캡션의 흰 halo 대신).
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
  circleSelected: {
    borderWidth: 3,
    borderColor: Acg.ink,
  },
});

export default OfflineMapPointMarkerView;
