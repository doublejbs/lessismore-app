import { FC, memo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Acg } from '@/constants/DesignTokens';
import MapPoint from '@/model/point/MapPoint';
import {
  getPointTypeColor,
  getPointTypeIcon,
  getPointTypeLabel,
} from '@/model/point/PointLabels';

interface Props {
  point: MapPoint;
  x: number;
  y: number;
  selected: boolean;
  onPress: (point: MapPoint) => void;
}

// 지도 포인트 마커(PointMarkerView)와 같은 치수 — 유형색 원 + 흰 테두리, 선택은 크게 + 잉크 테두리.
const HIT_AREA = 44;
const CIRCLE = 26;
const SELECTED_CIRCLE = 32;

/**
 * 오프라인 캔버스의 지도 포인트 마커 (OF-6 · BD-14). 유형색은 지도와 같은 단일 소스(`PointLabels`)다.
 * 캔버스는 지도 SDK가 아니라 화면 좌표에 그리므로 마커를 View로 직접 놓는다(44pt 터치 영역).
 */
const OfflineCanvasPointMarkerView: FC<Props> = ({
  point,
  x,
  y,
  selected,
  onPress,
}) => {
  const size = selected ? SELECTED_CIRCLE : CIRCLE;

  return (
    <TouchableOpacity
      style={[
        styles.hitArea,
        { left: x - HIT_AREA / 2, top: y - HIT_AREA / 2 },
        selected && styles.selectedLayer,
      ]}
      onPress={() => onPress(point)}
      activeOpacity={0.8}
      accessibilityRole='button'
      accessibilityLabel={`${getPointTypeLabel(point.getType())} ${point.getTitle()}`}
    >
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: getPointTypeColor(point.getType()),
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
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  hitArea: {
    position: 'absolute',
    width: HIT_AREA,
    height: HIT_AREA,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedLayer: {
    zIndex: 1,
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Acg.paper,
  },
  circleSelected: {
    borderColor: Acg.ink,
  },
});

export default memo(OfflineCanvasPointMarkerView);
