import { FC, useEffect, useState } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { Liquid, LiquidLayout } from '@/constants/DesignTokens';

interface Props {
  count?: number; // 스켈레톤 행 개수
}

/**
 * SR-4 인기 순위 행 스켈레톤(Liquid Depth).
 *
 * 실제로 도착할 행(`SearchRankRowView`)과 **같은 모양**이라야 로드 후 자리가 튀지 않는다 —
 * 순위 배지 원 → 브랜드/이름 두 줄 → 우측 콘덴스드 무게 → 담기 CTA 원 순서와 여백을 맞춘다.
 */
// 셔머 반 주기 — 왕복 1.2s(핸드오프 로딩 규칙).
const SHIMMER_HALF_DURATION = 600;
// 잉크 스케일의 가장 옅은 값. 가라앉은 면(surfaceSunken)은 흰 카드와 값이 붙어 형태가 사라진다.
const PLACEHOLDER_COLOR = Liquid.inkFaint;
const BAR_RADIUS = 4;
// 실제 행의 순위 배지·담기 CTA 지름.
const RANK_BADGE_SIZE = 28;
const CTA_SIZE = 32;

const SkeletonRow: FC = () => {
  // ref로 잡으면 렌더 중 `.current`를 읽어 React Compiler가 최적화를 포기한다 — 값을 상태로 든다.
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const animate = () => {
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
      ]).start(() => animate());
    };

    animate();
  }, [opacity]);

  return (
    <View style={styles.row}>
      {/* 순위 배지 */}
      <Animated.View style={[styles.rankBadge, { opacity }]} />

      {/* 브랜드 + 이름 */}
      <View style={styles.identity}>
        <Animated.View style={[styles.companyBar, { opacity }]} />
        <Animated.View style={[styles.nameBar, { opacity }]} />
      </View>

      {/* 우측 무게 */}
      <Animated.View style={[styles.weightBar, { opacity }]} />

      {/* 담기 CTA */}
      <Animated.View style={[styles.ctaCircle, { opacity }]} />
    </View>
  );
};

const SearchRankSkeletonView: FC<Props> = ({ count = 10 }) => {
  return (
    <View>
      {Array.from({ length: count }, (_, index) => (
        <SkeletonRow key={index} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  // 실제 행(LiquidMetricRow: paddingVertical 15 / gap 12)과 같은 리듬.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
    paddingHorizontal: LiquidLayout.cardPad,
  },
  rankBadge: {
    width: RANK_BADGE_SIZE,
    height: RANK_BADGE_SIZE,
    borderRadius: RANK_BADGE_SIZE / 2,
    backgroundColor: PLACEHOLDER_COLOR,
  },
  identity: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  // 브랜드 줄(12/16).
  companyBar: {
    height: 16,
    width: 60,
    backgroundColor: PLACEHOLDER_COLOR,
    borderRadius: BAR_RADIUS,
  },
  // 제품명 줄(15/20).
  nameBar: {
    height: 20,
    width: 140,
    backgroundColor: PLACEHOLDER_COLOR,
    borderRadius: BAR_RADIUS,
  },
  // 무게는 콘덴스드 20 — 우측 고정 폭.
  weightBar: {
    height: 22,
    width: 44,
    backgroundColor: PLACEHOLDER_COLOR,
    borderRadius: BAR_RADIUS,
  },
  ctaCircle: {
    width: CTA_SIZE,
    height: CTA_SIZE,
    borderRadius: CTA_SIZE / 2,
    backgroundColor: PLACEHOLDER_COLOR,
  },
});

export default SearchRankSkeletonView;
