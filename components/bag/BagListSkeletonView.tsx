import { FC, useEffect, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Color } from '@/constants/DesignTokens';

/**
 * 배낭 목록 로딩 스켈레톤(BAG-1).
 *
 * 예전에는 가운데 스피너 하나였다. 스피너는 화면 정중앙에 뜨는데 실제 목록은 상단 헤더 +
 * 좌우 2열 행이라, 데이터가 오는 순간 **구조가 통째로 바뀌며 덜컥거렸다.**
 * 스켈레톤은 들어올 화면과 같은 골격(헤더 행 + 배낭 행)을 미리 그려 그 이동을 없앤다.
 * 창고(WH-1)·피드가 쓰는 방식과 같다.
 */
const ROW_COUNT = 5;

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

// 배낭 행: 좌 [이름 · 기간] / 우 [무게]. 실제 행(BagItemView)과 같은 배치다.
const SkeletonRow: FC = () => {
  const opacity = useBreathingOpacity();

  return (
    <View style={styles.row}>
      <View style={styles.identityColumn}>
        <Animated.View style={[styles.nameBar, { opacity }]} />
        <Animated.View style={[styles.dateBar, { opacity }]} />
      </View>
      <Animated.View style={[styles.weightBar, { opacity }]} />
    </View>
  );
};

const BagListSkeletonView: FC = () => {
  const opacity = useBreathingOpacity();

  return (
    <View style={styles.container}>
      {/* `총 N개의 배낭이 있어요` + 정렬 드롭다운 자리 */}
      <View style={styles.header}>
        <Animated.View style={[styles.headerTitleBar, { opacity }]} />
        <Animated.View style={[styles.headerOrderBar, { opacity }]} />
      </View>

      {[...Array(ROW_COUNT)].map((_unused, index) => (
        <SkeletonRow key={index} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  headerTitleBar: {
    width: 180,
    height: 24,
    borderRadius: 4,
    backgroundColor: Color.borderLight,
  },
  headerOrderBar: {
    width: 84,
    height: 20,
    borderRadius: 4,
    backgroundColor: Color.borderLight,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: Color.borderLight,
  },
  identityColumn: {
    gap: 8,
  },
  nameBar: {
    width: 160,
    height: 18,
    borderRadius: 4,
    backgroundColor: Color.borderLight,
  },
  dateBar: {
    width: 200,
    height: 14,
    borderRadius: 4,
    backgroundColor: Color.borderLight,
  },
  weightBar: {
    width: 64,
    height: 20,
    borderRadius: 4,
    backgroundColor: Color.borderLight,
  },
});

export default BagListSkeletonView;
