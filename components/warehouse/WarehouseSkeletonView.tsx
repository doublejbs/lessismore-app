import { FC, useEffect, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import {
  Liquid,
  LiquidLayout,
  LiquidRadius,
  LiquidShadow,
} from '@/constants/DesignTokens';

interface Props {
  count?: number; // 스켈레톤 행 개수
}

// 셔머 반 주기 — 왕복 1.2s(핸드오프 로딩 규칙). 스피너는 쓰지 않는다.
const SHIMMER_HALF_DURATION = 600;
// 잉크 스케일의 가장 옅은 값. 가라앉은 면(surfaceSunken)은 흰 카드와 값이 붙어 형태가 사라진다.
const PLACEHOLDER_COLOR = Liquid.inkFaint;
const BAR_RADIUS = 4;

/**
 * WH-1 창고 목록 스켈레톤 (Liquid Depth).
 *
 * 도착할 목록(흰 카드 하나 + `LiquidMetricRow` 행들)과 **같은 골격**이라야 로드 후 자리가
 * 튀지 않는다 — 카드 모서리·행 여백·헤어라인·우측 무게 자리를 그대로 둔다.
 */
const SkeletonRow: FC<{ divider: boolean }> = ({ divider }) => {
  // ref로 잡으면 렌더 중 `.current`를 읽어 React Compiler가 최적화를 포기한다 — 값을 상태로 든다.
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    // 재귀 start 콜백 대신 loop — 언마운트 후에도 다음 주기가 스스로 살아나는 일이 없고,
    // cleanup에서 한 번 멈추면 끝난다(BagDetailSkeletonView와 같은 패턴).
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: SHIMMER_HALF_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: SHIMMER_HALF_DURATION,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [opacity]);

  return (
    <View>
      {divider ? <View style={styles.divider} /> : null}
      <View style={styles.row}>
        {/* 좌 정체 — 브랜드(12) → 이름(15) → 색상·사용률(12) */}
        <View style={styles.identity}>
          <Animated.View style={[styles.brandBar, { opacity }]} />
          <Animated.View style={[styles.nameBar, { opacity }]} />
          <Animated.View style={[styles.metaBar, { opacity }]} />
        </View>

        {/* 우 무게 — 콘덴스드 20 자리 */}
        <Animated.View style={[styles.weightBar, { opacity }]} />
      </View>
    </View>
  );
};

const WarehouseSkeletonView: FC<Props> = ({ count = 6 }) => {
  return (
    // 그림자는 껍데기가 든다 — 안쪽에서 모서리를 깎으므로 같은 뷰에 그림자를 걸면 잘린다.
    <View style={styles.cardShell}>
      <View style={styles.cardClip}>
        {Array.from({ length: count }, (_, index) => (
          <SkeletonRow key={index} divider={index > 0} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardShell: {
    borderRadius: LiquidRadius.card,
    boxShadow: LiquidShadow.card,
  },
  cardClip: {
    borderRadius: LiquidRadius.card,
    overflow: 'hidden',
    backgroundColor: Liquid.surface,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Liquid.hairline,
    marginLeft: LiquidLayout.cardPad,
  },
  // 실제 행(LiquidMetricRow: paddingVertical 15 / paddingHorizontal 16 / gap 12)과 같은 리듬.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
    paddingHorizontal: LiquidLayout.cardPad,
  },
  identity: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  brandBar: {
    height: 16,
    width: 64,
    backgroundColor: PLACEHOLDER_COLOR,
    borderRadius: BAR_RADIUS,
  },
  nameBar: {
    height: 20,
    width: '70%',
    backgroundColor: PLACEHOLDER_COLOR,
    borderRadius: BAR_RADIUS,
  },
  metaBar: {
    height: 16,
    width: '45%',
    backgroundColor: PLACEHOLDER_COLOR,
    borderRadius: BAR_RADIUS,
  },
  weightBar: {
    height: 22,
    width: 52,
    backgroundColor: PLACEHOLDER_COLOR,
    borderRadius: BAR_RADIUS,
  },
});

export default WarehouseSkeletonView;
