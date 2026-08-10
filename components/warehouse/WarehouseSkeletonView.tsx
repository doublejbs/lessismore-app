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
}

/**
 * WH-1 창고 목록 스켈레톤 (Liquid Depth).
 *
 * 도착할 목록(흰 카드 하나 + `LiquidMetricRow` 행들)과 **같은 골격**이라야 로드 후 자리가
 * 튀지 않는다 — 카드 모서리·행 여백·헤어라인·우측 무게 자리를 그대로 둔다.
 */
const SkeletonRow: FC<{ divider: boolean }> = ({ divider }) => {
  // 셔머·막대 색·모서리 모두 기본값(1 ↔ 0.5 / 반 주기 600ms / inkFaint / 4)을 그대로 쓴다.
  const opacity = useLiquidShimmer();

  return (
    <View>
      {divider ? <View style={styles.divider} /> : null}
      <View style={styles.row}>
        {/* 좌 정체 — 브랜드(12) → 이름(15) → 색상·사용률(12) */}
        <View style={styles.identity}>
          <LiquidSkeletonBar opacity={opacity} width={64} height={16} />
          <LiquidSkeletonBar opacity={opacity} width='70%' height={20} />
          <LiquidSkeletonBar opacity={opacity} width='45%' height={16} />
        </View>

        {/* 우 무게 — 콘덴스드 20 자리 */}
        <LiquidSkeletonBar opacity={opacity} width={52} height={22} />
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
});

export default WarehouseSkeletonView;
