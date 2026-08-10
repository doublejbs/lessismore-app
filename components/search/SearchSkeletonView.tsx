import { FC, useEffect, useState } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
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
 * **썸네일 자리는 두지 않는다** — 사진은 내 창고에 있는 장비에만 붙으므로(DataModel §1
 * 비공개 원칙, 카탈로그 조회에는 이미지가 없다) 자리를 두면 대부분의 행에서 빈 칸이 된다.
 * 보유 행에서는 도착 시 정체 컬럼이 썸네일만큼 밀리는데, 그쪽이 매 행 빈 칸보다 조용하다.
 * 막대 높이 합(약 86)은 실제 행의 최소 높이(썸네일 44 + 세로 패딩 30 = 74)를 넘으므로
 * 행 키도 도착 후 줄어들지 않는다 — 막대를 낮출 때 이 하한을 함께 확인한다.
 */
// 셔머 반 주기 — 왕복 1.2s(핸드오프 로딩 규칙). 스피너는 쓰지 않는다.
const SHIMMER_HALF_DURATION = 600;
// 스켈레톤 막대는 잉크 스케일의 가장 옅은 값이다 — 흰 카드와 같은 값을 쓰면 형태가 사라진다.
const PLACEHOLDER_COLOR = Liquid.inkFaint;
const BAR_RADIUS = 4;
// 실제 행의 담기 CTA 지름.
const CTA_SIZE = 32;

const SkeletonRow: FC = () => {
  // ref로 잡으면 렌더 중 `.current`를 읽어 React Compiler가 최적화를 포기한다 — 값을 상태로 든다.
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    // 재귀 start 콜백 대신 loop — 언마운트 후 다음 주기가 스스로 살아나지 않고,
    // cleanup에서 한 번 멈추면 끝난다(SearchRankSkeletonView와 같은 패턴).
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
    <View style={styles.card}>
      <View style={styles.row}>
        {/* 브랜드 + 이름 + 메타 */}
        <View style={styles.identity}>
          <Animated.View style={[styles.companyBar, { opacity }]} />
          <Animated.View style={[styles.nameBar, { opacity }]} />
          <Animated.View style={[styles.metaBar, { opacity }]} />
        </View>

        {/* 우측 무게 */}
        <Animated.View style={[styles.weightBar, { opacity }]} />

        {/* 담기 CTA */}
        <Animated.View style={[styles.ctaCircle, { opacity }]} />
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
  // 색상·사용률 줄(12/16).
  metaBar: {
    height: 16,
    width: 80,
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

export default SearchSkeletonView;
