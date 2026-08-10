import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import LiquidSkeletonBar from '@/components/liquid/LiquidSkeletonBar';
import useLiquidShimmer from '@/components/liquid/useLiquidShimmer';
import {
  Liquid,
  LiquidLayout,
  LiquidRadius,
  LiquidShadow,
} from '@/constants/DesignTokens';

interface Props {
  count?: number; // 스켈레톤 행 개수
  /**
   * 도착할 행이 `제품 n` 둘째 줄을 갖는지(브랜드 디렉토리 SR-8 = true, 브랜드 필터 시트
   * FD-3 = false — 그쪽은 `showCount={false}`다). 줄 수가 갈리면 도착 순간 목록 키가 바뀐다.
   */
  showMeta?: boolean;
}

/**
 * 브랜드 행 스켈레톤 (Liquid Depth, 2026-08-11 신설).
 *
 * 브랜드 디렉토리(SR-8)와 브랜드 필터 시트(FD-3)가 쓴다. 도착할 행(`BrandRowView`)과
 * **같은 골격**이다 — 행 하나가 곧 카드이고 그 안에 이름 줄(+ 디렉토리는 `제품 n` 한 줄 더)과
 * 우측 표식 자리가 놓인다.
 * 예전에는 장비 행 스켈레톤을 그대로 썼는데(무게·CTA 자리까지 있는 3줄 골격) 브랜드 행이
 * 도착하는 순간 목록이 통째로 줄어들었다.
 */
// 실제 행의 표식 자리(체크 원·쉐브론)와 같은 지름. 원이라 모서리는 지름의 절반이다.
const MARK_SIZE = 26;

interface SkeletonRowProps {
  showMeta: boolean;
}

const SkeletonRow: FC<SkeletonRowProps> = ({ showMeta }) => {
  // 셔머·막대 색·모서리 모두 기본값(1 ↔ 0.5 / 반 주기 600ms / inkFaint / 4)을 그대로 쓴다.
  const opacity = useLiquidShimmer();

  return (
    <View style={styles.card}>
      <View style={styles.identity}>
        {/* 브랜드 이름 줄(15/20) + `제품 n` 줄(12.5/17) */}
        <LiquidSkeletonBar opacity={opacity} width={120} height={20} />
        {showMeta ? (
          <LiquidSkeletonBar opacity={opacity} width={56} height={17} />
        ) : null}
      </View>
      <LiquidSkeletonBar
        opacity={opacity}
        width={MARK_SIZE}
        height={MARK_SIZE}
        radius={MARK_SIZE / 2}
      />
    </View>
  );
};

const BrandRowSkeletonView: FC<Props> = ({ count = 8, showMeta = true }) => {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }, (_, index) => (
        <SkeletonRow key={index} showMeta={showMeta} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  list: {
    gap: LiquidLayout.listGap,
  },
  // 실제 행 카드와 같은 면·모서리·패딩.
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: LiquidLayout.cardPad,
    borderRadius: LiquidRadius.tile,
    backgroundColor: Liquid.surface,
    boxShadow: LiquidShadow.tile,
  },
  identity: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
});

export default BrandRowSkeletonView;
