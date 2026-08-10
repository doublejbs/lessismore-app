import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import LiquidSkeletonBar from '@/components/liquid/LiquidSkeletonBar';
import useLiquidShimmer from '@/components/liquid/useLiquidShimmer';
import { LiquidLayout } from '@/constants/DesignTokens';

interface Props {
  count?: number; // 스켈레톤 행 개수
}

/**
 * SR-4 인기 순위 행 스켈레톤(Liquid Depth).
 *
 * 실제로 도착할 행(`SearchRankRowView`)과 **같은 모양**이라야 로드 후 자리가 튀지 않는다 —
 * 순위 배지 원 → 브랜드/이름 두 줄 → 우측 콘덴스드 무게 → 담기 CTA 원 순서와 여백을 맞춘다.
 */
// 실제 행의 순위 배지·담기 CTA 지름. 원이라 모서리는 지름의 절반이다.
const RANK_BADGE_SIZE = 28;
const CTA_SIZE = 32;

const SkeletonRow: FC = () => {
  // 셔머·막대 색·모서리 모두 기본값(1 ↔ 0.5 / 반 주기 600ms / inkFaint / 4)을 그대로 쓴다.
  const opacity = useLiquidShimmer();

  return (
    <View style={styles.row}>
      {/* 순위 배지 */}
      <LiquidSkeletonBar
        opacity={opacity}
        width={RANK_BADGE_SIZE}
        height={RANK_BADGE_SIZE}
        radius={RANK_BADGE_SIZE / 2}
      />

      {/* 브랜드 + 이름 — 각각 브랜드 줄(12/16)·제품명 줄(15/20)과 같은 높이 */}
      <View style={styles.identity}>
        <LiquidSkeletonBar opacity={opacity} width={60} height={16} />
        <LiquidSkeletonBar opacity={opacity} width={140} height={20} />
      </View>

      {/* 우측 무게 — 콘덴스드 20, 고정 폭 */}
      <LiquidSkeletonBar opacity={opacity} width={44} height={22} />

      {/* 담기 CTA */}
      <LiquidSkeletonBar
        opacity={opacity}
        width={CTA_SIZE}
        height={CTA_SIZE}
        radius={CTA_SIZE / 2}
      />
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
  identity: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
});

export default SearchRankSkeletonView;
