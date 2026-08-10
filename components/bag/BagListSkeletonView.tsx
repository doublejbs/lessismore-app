import { FC, useEffect, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import {
  Liquid,
  LiquidLayout,
  LiquidRadius,
  LiquidShadow,
} from '@/constants/DesignTokens';

/**
 * 배낭 목록 로딩 스켈레톤(BAG-1).
 *
 * 예전에는 가운데 스피너 하나였다. 스피너는 화면 정중앙에 뜨는데 실제 목록은 상단 헤더 +
 * 섹션 라벨 + 카드라, 데이터가 오는 순간 **구조가 통째로 바뀌며 덜컥거렸다.**
 * 스켈레톤은 들어올 화면과 같은 골격(제목·요약 → 섹션 라벨 → radius 22 카드)을 미리 그려
 * 그 이동을 없앤다. 핸드오프는 스피너를 쓰지 않는다.
 */
const CARD_COUNT = 3;

// 셔머 한 주기 1.2s(핸드오프 로딩 규칙) — 왕복이라 한 방향 600ms.
const SHIMMER_HALF_DURATION = 600;
const SHIMMER_MIN = 0.35;
const SHIMMER_MAX = 0.75;

const useShimmerOpacity = () => {
  // `useRef(...).current`를 렌더 중 읽으면 react-hooks 규칙에 걸린다 — 초기화 함수로 1회만 만든다.
  const [opacity] = useState(() => new Animated.Value(SHIMMER_MIN));

  useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: SHIMMER_MAX,
          duration: SHIMMER_HALF_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: SHIMMER_MIN,
          duration: SHIMMER_HALF_DURATION,
          useNativeDriver: true,
        }),
      ]).start(() => animate());
    };

    animate();
  }, [opacity]);

  return opacity;
};

// 도착할 카드와 같은 모양 — radius 22 흰 카드, 좌 [배지 · 이름 · 기간] / 우 [무게].
const SkeletonCard: FC = () => {
  const opacity = useShimmerOpacity();

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.identityColumn}>
          <Animated.View style={[styles.badgeBar, { opacity }]} />
          <Animated.View style={[styles.nameBar, { opacity }]} />
          <Animated.View style={[styles.dateBar, { opacity }]} />
        </View>
        <Animated.View style={[styles.weightBar, { opacity }]} />
      </View>
    </View>
  );
};

const BagListSkeletonView: FC = () => {
  const opacity = useShimmerOpacity();

  return (
    <View style={styles.container}>
      {/* `배낭` 제목 + `N개 · 평균 N.Nkg` 요약 · 우측 정렬 드롭다운 자리 */}
      <View style={styles.header}>
        <View style={styles.headerIdentity}>
          <Animated.View style={[styles.headerTitleBar, { opacity }]} />
          <Animated.View style={[styles.headerSummaryBar, { opacity }]} />
        </View>
        <Animated.View style={[styles.headerOrderBar, { opacity }]} />
      </View>

      <Animated.View style={[styles.sectionLabelBar, { opacity }]} />

      {[...Array(CARD_COUNT)].map((_unused, index) => (
        <SkeletonCard key={index} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 18,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerIdentity: {
    gap: 8,
  },
  // 실제 헤더의 라인박스(제목 lineHeight 38, 요약 ~17)와 같은 높이 — 로딩 해제 시 튀지 않게.
  headerTitleBar: {
    width: 96,
    height: 38,
    borderRadius: 8,
    backgroundColor: Liquid.inkFaint,
  },
  headerSummaryBar: {
    width: 132,
    height: 17,
    borderRadius: 6,
    backgroundColor: Liquid.inkFaint,
  },
  headerOrderBar: {
    width: 78,
    height: 16,
    borderRadius: 8,
    backgroundColor: Liquid.inkFaint,
  },
  sectionLabelBar: {
    width: 64,
    height: 16,
    borderRadius: 5,
    marginTop: 24,
    marginBottom: 10,
    backgroundColor: Liquid.inkFaint,
  },
  card: {
    padding: 18,
    marginBottom: LiquidLayout.listGap,
    borderRadius: LiquidRadius.card,
    backgroundColor: Liquid.surface,
    boxShadow: LiquidShadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  identityColumn: {
    flex: 1,
    gap: 8,
  },
  /**
   * 카드 안 자리는 `surfaceSunken`이 정본이지만 흰 면 위에서 셔머로 투명도를 내리면
   * 거의 사라져 빈 카드처럼 읽힌다 — 한 단계 진한 `inkFaint`를 같은 값으로 쓰고
   * 지면 위 헤더 자리와도 톤을 맞춘다.
   */
  badgeBar: {
    width: 52,
    height: 22,
    borderRadius: 11,
    backgroundColor: Liquid.inkFaint,
  },
  nameBar: {
    width: '68%',
    height: 17,
    borderRadius: 6,
    backgroundColor: Liquid.inkFaint,
  },
  dateBar: {
    width: '84%',
    height: 12.5,
    borderRadius: 6,
    backgroundColor: Liquid.inkFaint,
  },
  weightBar: {
    width: 64,
    height: 30,
    borderRadius: 8,
    backgroundColor: Liquid.inkFaint,
  },
});

export default BagListSkeletonView;
