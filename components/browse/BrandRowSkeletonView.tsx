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
// 셔머 반 주기 — 왕복 1.2s(핸드오프 로딩 규칙). 스피너는 쓰지 않는다.
const SHIMMER_HALF_DURATION = 600;
// 스켈레톤 막대는 잉크 스케일의 가장 옅은 값이다 — 흰 카드와 같은 값을 쓰면 형태가 사라진다.
const PLACEHOLDER_COLOR = Liquid.inkFaint;
const BAR_RADIUS = 4;
// 실제 행의 표식 자리(체크 원·쉐브론)와 같은 지름.
const MARK_SIZE = 26;

interface SkeletonRowProps {
  showMeta: boolean;
}

const SkeletonRow: FC<SkeletonRowProps> = ({ showMeta }) => {
  // ref로 잡으면 렌더 중 `.current`를 읽어 React Compiler가 최적화를 포기한다 — 값을 상태로 든다.
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    // 재귀 start 콜백 대신 loop — 언마운트 후 다음 주기가 스스로 살아나지 않는다.
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
      <View style={styles.identity}>
        <Animated.View style={[styles.nameBar, { opacity }]} />
        {showMeta ? (
          <Animated.View style={[styles.metaBar, { opacity }]} />
        ) : null}
      </View>
      <Animated.View style={[styles.mark, { opacity }]} />
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
  // 브랜드 이름 줄(15/20).
  nameBar: {
    height: 20,
    width: 120,
    backgroundColor: PLACEHOLDER_COLOR,
    borderRadius: BAR_RADIUS,
  },
  // `제품 n` 줄(12.5/17).
  metaBar: {
    height: 17,
    width: 56,
    backgroundColor: PLACEHOLDER_COLOR,
    borderRadius: BAR_RADIUS,
  },
  mark: {
    width: MARK_SIZE,
    height: MARK_SIZE,
    borderRadius: MARK_SIZE / 2,
    backgroundColor: PLACEHOLDER_COLOR,
  },
});

export default BrandRowSkeletonView;
