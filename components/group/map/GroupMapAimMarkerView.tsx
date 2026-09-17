import { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { Acg } from '@/constants/DesignTokens';

const MARKER_SIZE = 64;
const CENTER = MARKER_SIZE / 2;
const RING_RADIUS = 18;
const CORE_RADIUS = 3;
const TICK_INNER = 11;
const TICK_OUTER = 25;
const RING_WIDTH = 2;
const TICK_WIDTH = 2;

/**
 * 포인트 추가 조준 마커 (GRP-9).
 *
 * **지도 좌표에 붙이지 않는다** — 화면 정중앙에 고정되고 지도가 그 아래에서 움직인다.
 * 등록된 포인트 마커(유형 색이 채워진 원 + 아이콘)와 달리 **속이 빈 조준선**이라,
 * 아직 찍히지 않은 자리와 이미 찍힌 포인트가 한눈에 갈린다.
 *
 * 추가 모드에서만 렌더하고, 탭을 먹지 않도록 부모가 `pointerEvents='none'`으로 감싼다.
 */
const GroupMapAimMarkerView: FC = () => {
  return (
    <View style={styles.root} pointerEvents='none'>
      <Svg width={MARKER_SIZE} height={MARKER_SIZE}>
        {/* 반투명 흰 halo를 먼저 깔아 어두운 지형 위에서도 조준선이 살아 있게 한다. */}
        <Circle
          cx={CENTER}
          cy={CENTER}
          r={RING_RADIUS}
          stroke={Acg.glassFill}
          strokeWidth={RING_WIDTH + 3}
          fill='none'
        />
        <Circle
          cx={CENTER}
          cy={CENTER}
          r={RING_RADIUS}
          stroke={Acg.ink}
          strokeWidth={RING_WIDTH}
          fill='none'
        />
        <Line
          x1={CENTER}
          y1={CENTER - TICK_INNER}
          x2={CENTER}
          y2={CENTER - TICK_OUTER}
          stroke={Acg.ink}
          strokeWidth={TICK_WIDTH}
        />
        <Line
          x1={CENTER}
          y1={CENTER + TICK_INNER}
          x2={CENTER}
          y2={CENTER + TICK_OUTER}
          stroke={Acg.ink}
          strokeWidth={TICK_WIDTH}
        />
        <Line
          x1={CENTER - TICK_INNER}
          y1={CENTER}
          x2={CENTER - TICK_OUTER}
          y2={CENTER}
          stroke={Acg.ink}
          strokeWidth={TICK_WIDTH}
        />
        <Line
          x1={CENTER + TICK_INNER}
          y1={CENTER}
          x2={CENTER + TICK_OUTER}
          y2={CENTER}
          stroke={Acg.ink}
          strokeWidth={TICK_WIDTH}
        />
        <Circle cx={CENTER} cy={CENTER} r={CORE_RADIUS} fill={Acg.ink} />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  // 지도 영역 전체를 덮고 가운데에 조준선을 둔다 — 카메라 중심이 곧 이 자리다.
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default GroupMapAimMarkerView;
