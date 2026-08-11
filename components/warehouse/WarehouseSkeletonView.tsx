import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import LiquidSkeletonBar from '@/components/liquid/LiquidSkeletonBar';
import useLiquidShimmer from '@/components/liquid/useLiquidShimmer';
import { GEAR_THUMBNAIL_SIZE } from '@/components/gear/GearThumbnailView';
import {
  Liquid,
  LiquidLayout,
  LiquidRadius,
  LiquidShadow,
} from '@/constants/DesignTokens';

interface Props {
  count?: number; // 스켈레톤 행 개수
}

// 실제 행(`LiquidMetricRow`)의 세로 패딩. 프리미티브가 내보내지 않는 값이라 여기서 맞춘다.
const ROW_PAD_V = 15;

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
        {/* 좌 정체 — 브랜드(12) → 이름(15).
            서브라인(`사용률 {n}%`)은 그리지 않는다 — 사용 기록이 있는 장비에만 붙어(WH-1,
            2026-08-11 디자인 리뷰) 대부분의 행이 두 줄이다. 있을지 없을지 모르는 줄을 미리
            그리면 로드 후 목록이 줄어드는 쪽으로 튄다. 행 높이는 아래 `minHeight`가 지킨다. */}
        <View style={styles.identity}>
          <LiquidSkeletonBar opacity={opacity} width={64} height={16} />
          <LiquidSkeletonBar opacity={opacity} width='70%' height={20} />
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
  // 높이도 실제 행과 같게 잡는다 — 창고 행은 썸네일 한 변(44)을 본문 최소 높이로 걸어(WH-1)
  // 정체가 두 줄인 행이 모두 이 키로 묶인다.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: GEAR_THUMBNAIL_SIZE + ROW_PAD_V * 2,
    paddingVertical: ROW_PAD_V,
    paddingHorizontal: LiquidLayout.cardPad,
  },
  identity: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
});

export default WarehouseSkeletonView;
