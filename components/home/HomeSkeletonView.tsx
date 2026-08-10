import { FC, useEffect, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import {
  Liquid,
  LiquidLayout,
  LiquidRadius,
} from '@/constants/DesignTokens';

/**
 * 홈 로딩 스켈레톤(HM-6).
 *
 * 가운데 스피너를 쓰지 않는다 — 스피너는 화면 정중앙인데 실제 홈은 상단 타이틀 +
 * 카드 두 장이라, 데이터가 오는 순간 구조가 통째로 바뀌며 덜컥거린다.
 * 창고(WH-1)·배낭(BAG-1)이 쓰는 방식과 같다.
 *
 * Liquid Depth: 셔머 면은 `surfaceSunken`, 골격은 실제 화면과 같은 라운드를 쓴다 —
 * 스켈레톤이 각지면 데이터가 도착하는 순간 모서리가 둥글어지며 덜컥거린다.
 */
const PREVIEW_ROWS = 4;

const useBreathingOpacity = () => {
  // `useRef(...).current`를 렌더 중 읽으면 react-hooks 규칙에 걸린다 — 초기화 함수로 1회만 만든다.
  const [opacity] = useState(() => new Animated.Value(0.3));

  useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start(() => animate());
    };

    animate();
  }, [opacity]);

  return opacity;
};

const HomeSkeletonView: FC = () => {
  const opacity = useBreathingOpacity();

  return (
    <View style={styles.container}>
      {/* 다가오는 일정 카드 자리 */}
      <Animated.View style={[styles.sectionTitleBar, { opacity }]} />
      <View style={styles.tile}>
        <Animated.View style={[styles.badgeBar, { opacity }]} />
        <Animated.View style={[styles.titleBar, { opacity }]} />
        <Animated.View style={[styles.metaBar, { opacity }]} />
        <Animated.View style={[styles.statsBar, { opacity }]} />
        <Animated.View style={[styles.ctaBar, { opacity }]} />
      </View>

      {/* 창고 미리보기 카드 자리 */}
      <Animated.View style={[styles.sectionTitleBar, { opacity }]} />
      <View style={styles.list}>
        <Animated.View style={[styles.chipsBar, { opacity }]} />
        {[...Array(PREVIEW_ROWS)].map((_unused, index) => (
          <View key={index} style={styles.gearRow}>
            <Animated.View style={[styles.gearNameBar, { opacity }]} />
            <Animated.View style={[styles.gearWeightBar, { opacity }]} />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionTitleBar: {
    width: 96,
    height: 20,
    borderRadius: LiquidRadius.tile,
    backgroundColor: Liquid.surfaceSunken,
    marginBottom: 10,
  },
  // 들어올 화면과 같은 골격이어야 덜컥거리지 않는다 — 일정은 회색 타일, 창고는 평평한 목록.
  tile: {
    backgroundColor: Liquid.surface,
    borderRadius: 28,
    padding: 20,
    marginBottom: LiquidLayout.section,
  },
  list: {
    marginBottom: LiquidLayout.section,
  },
  // 셔머 면은 전부 surfaceSunken 하나로 통일한다 — 종이 면(#FFF) 위에서 충분히 읽힌다.
  badgeBar: {
    width: 52,
    height: 24,
    borderRadius: LiquidRadius.card,
    backgroundColor: Liquid.surfaceSunken,
    marginBottom: 10,
  },
  titleBar: {
    width: 170,
    height: 26,
    borderRadius: LiquidRadius.tile,
    backgroundColor: Liquid.surfaceSunken,
    marginBottom: 8,
  },
  metaBar: {
    width: 210,
    height: 16,
    borderRadius: LiquidRadius.tile,
    backgroundColor: Liquid.surfaceSunken,
  },
  statsBar: {
    height: 56,
    borderRadius: LiquidRadius.tile,
    backgroundColor: Liquid.surfaceSunken,
    marginTop: 16,
  },
  ctaBar: {
    height: 50,
    borderRadius: LiquidRadius.card,
    backgroundColor: Liquid.surfaceSunken,
    marginTop: 16,
  },
  chipsBar: {
    height: 34,
    borderRadius: LiquidRadius.pill,
    backgroundColor: Liquid.surfaceSunken,
  },
  gearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Liquid.hairline,
  },
  gearNameBar: {
    width: 150,
    height: 16,
    borderRadius: LiquidRadius.tile,
    backgroundColor: Liquid.surfaceSunken,
  },
  gearWeightBar: {
    width: 44,
    height: 14,
    borderRadius: LiquidRadius.tile,
    backgroundColor: Liquid.surfaceSunken,
  },
});

export default HomeSkeletonView;
