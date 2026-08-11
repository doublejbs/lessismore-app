import { FC, useEffect, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Acg, AcgRadius } from '@/constants/DesignTokens';

/**
 * 홈 로딩 스켈레톤(HM-6).
 *
 * 가운데 스피너를 쓰지 않는다 — 스피너는 화면 정중앙인데 실제 홈은 상단 타이틀 +
 * 카드 두 장이라, 데이터가 오는 순간 구조가 통째로 바뀌며 덜컥거린다.
 * 창고(WH-1)·배낭(BAG-1)이 쓰는 방식과 같다.
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
        <View style={styles.listGap} />
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
  // 실제 섹션 제목(15pt/lineHeight 20)과 같은 자리·높이.
  sectionTitleBar: {
    width: 88,
    height: 20,
    borderRadius: 2,
    backgroundColor: Acg.controlFill,
    marginBottom: 10,
  },
  // 들어올 화면과 같은 골격이어야 덜컥거리지 않는다 — 일정은 회색 면, 창고는 평평한 목록.
  tile: {
    backgroundColor: Acg.controlFill,
    borderRadius: AcgRadius.thumb,
    padding: 16,
    marginBottom: 26,
  },
  list: {
    marginBottom: 26,
  },
  /**
   * 회색 면(#F2F2F2) 위의 막대는 지면 위 막대와 같은 값을 쓸 수 없다 — 같은 색이면
   * 아무것도 안 보인다. 면 위에서만 한 톤 진한 헤어라인 값을 쓴다.
   */
  badgeBar: {
    width: 48,
    height: 20,
    borderRadius: 2,
    backgroundColor: Acg.hairline,
    marginBottom: 10,
  },
  titleBar: {
    width: 170,
    height: 25,
    borderRadius: 2,
    backgroundColor: Acg.hairline,
    marginBottom: 6,
  },
  metaBar: {
    width: 210,
    height: 18,
    borderRadius: 2,
    backgroundColor: Acg.hairline,
  },
  statsBar: {
    height: 48,
    borderRadius: 2,
    backgroundColor: Acg.hairline,
    marginTop: 14,
  },
  // 실제 주 액션 알약(높이 48, 완전한 알약)과 같은 모양.
  ctaBar: {
    height: 48,
    borderRadius: 24,
    backgroundColor: Acg.hairline,
    marginTop: 14,
  },
  chipsBar: {
    height: 32,
    borderRadius: 16,
    backgroundColor: Acg.controlFill,
  },
  // 실제 장비 행(높이 56 + 상단 헤어라인)과 같은 리듬.
  gearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    borderTopWidth: 1,
    borderTopColor: Acg.hairline,
  },
  listGap: {
    height: 6,
  },
  gearNameBar: {
    width: 150,
    height: 18,
    borderRadius: 2,
    backgroundColor: Acg.controlFill,
  },
  gearWeightBar: {
    width: 44,
    height: 18,
    borderRadius: 2,
    backgroundColor: Acg.controlFill,
  },
});

export default HomeSkeletonView;
