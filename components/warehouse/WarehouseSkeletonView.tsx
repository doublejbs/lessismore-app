import { FC, useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Color } from '@/constants/DesignTokens';

const SkeletonItem: FC = () => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animateLoading = () => {
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
      ]).start(() => animateLoading());
    };

    animateLoading();
  }, [opacity]);

  return (
    <View style={styles.skeletonContainer}>
      {/* 좌 정체 컬럼 — 브랜드·이름·색상 */}
      <View style={styles.skeletonIdentityColumn}>
        <Animated.View style={[styles.skeletonCompanyText, { opacity }]} />
        <Animated.View style={[styles.skeletonNameText, { opacity }]} />
        <Animated.View style={[styles.skeletonColorText, { opacity }]} />
      </View>

      {/* 우 지표 컬럼 — 사용률 배지(위) + 무게(아래) */}
      <View style={styles.skeletonMetricsColumn}>
        <Animated.View style={[styles.skeletonUsedRateBadge, { opacity }]} />
        <Animated.View style={[styles.skeletonWeightText, { opacity }]} />
      </View>
    </View>
  );
};

const WarehouseSkeletonView: FC = () => {
  return (
    <View style={styles.container}>
      {[...Array(5)].map((_, index) => (
        <SkeletonItem key={index} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 10,
    gap: 4,
  },
  // WH-1 텍스트 우선 · 좌 정체/우 지표 2열 행에 맞춘 로딩 자리.
  // 썸네일 자리는 두지 않는다 — 사진은 사용자가 올린 행에만 붙고 대다수 장비에는 없어
  // 텍스트 행이 기본 모습이다(DataModel §1 2026-07-29 개정). 썸네일 박스를 두면 오히려 대부분 어긋난다.
  skeletonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 0,
    gap: 12,
  },
  skeletonIdentityColumn: {
    flex: 1,
    gap: 6,
    overflow: 'hidden',
  },
  skeletonMetricsColumn: {
    alignItems: 'flex-end',
    gap: 4,
  },
  // 브랜드는 이름과 동일한 타이포라 바 높이도 skeletonNameText와 같게 둔다.
  skeletonCompanyText: {
    height: 16,
    width: 60,
    backgroundColor: Color.chipInactiveBg,
    borderRadius: 4,
  },
  skeletonUsedRateBadge: {
    height: 16,
    width: 70,
    backgroundColor: Color.chipInactiveBg,
    borderRadius: 8,
  },
  skeletonNameText: {
    height: 16,
    width: '80%',
    backgroundColor: Color.chipInactiveBg,
    borderRadius: 4,
  },
  skeletonColorText: {
    height: 14,
    width: '50%',
    backgroundColor: Color.chipInactiveBg,
    borderRadius: 4,
  },
  skeletonWeightText: {
    height: 14,
    width: 40,
    backgroundColor: Color.chipInactiveBg,
    borderRadius: 4,
  },
});

export default WarehouseSkeletonView;
