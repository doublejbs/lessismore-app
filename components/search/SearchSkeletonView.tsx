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
 * SR-7 카테고리·브랜드 목록 행 스켈레톤 (Liquid Depth, 2026-08-11 이식).
 *
 * 실제로 도착할 행(`SearchGearView`)과 **같은 골격**이라야 로드 후 자리가 튀지 않는다 —
 * 행 하나가 곧 카드이고, 그 안에 브랜드/이름/메타 세 줄 → 우측 콘덴스드 무게 → 담기 CTA 원이
 * 같은 여백으로 놓인다.
 *
 * **썸네일 자리는 두지 않는다** — 목록 행에서 사진을 걷어냈으므로(2026-08-11 디자인 리뷰,
 * [Warehouse.md](../../specs/Warehouse.md) WH-1) 도착할 행에도 그 자리가 없다.
 * 막대 높이 합(약 86)은 실제 행의 최소 높이(본문 44 + 세로 패딩 30 = 74)를 넘으므로
 * 행 키도 도착 후 줄어들지 않는다 — 막대를 낮출 때 이 하한을 함께 확인한다.
 */
// 실제 행의 담기 CTA 지름. 원이라 모서리는 지름의 절반이다.
const CTA_SIZE = 32;

const SkeletonRow: FC = () => {
  // 셔머·막대 색·모서리 모두 기본값(1 ↔ 0.5 / 반 주기 600ms / inkFaint / 4)을 그대로 쓴다.
  const opacity = useLiquidShimmer();

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        {/* 브랜드(12/16) + 이름(15/20) + 색상·사용률(12/16) — 실제 줄과 같은 높이 */}
        <View style={styles.identity}>
          <LiquidSkeletonBar opacity={opacity} width={60} height={16} />
          <LiquidSkeletonBar opacity={opacity} width={140} height={20} />
          <LiquidSkeletonBar opacity={opacity} width={80} height={16} />
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
    </View>
  );
};

const SearchSkeletonView: FC<Props> = ({ count = 5 }) => {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }, (_, index) => (
        <SkeletonRow key={index} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  // 카드 사이 간격은 도착할 목록과 같은 값이다.
  list: {
    gap: LiquidLayout.listGap,
  },
  // 실제 행 카드와 같은 면·모서리. 그림자까지 같아야 로드 후 층이 바뀌지 않는다.
  card: {
    borderRadius: LiquidRadius.tile,
    backgroundColor: Liquid.surface,
    boxShadow: LiquidShadow.tile,
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

export default SearchSkeletonView;
