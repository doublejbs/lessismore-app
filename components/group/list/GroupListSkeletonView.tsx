import { FC, useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Acg, AcgRow, AcgType } from '@/constants/DesignTokens';

const SKELETON_ROWS = [0, 1, 2, 3];
const SKELETON_SHADE = '#E3E3E3';

const useBreathingOpacity = () => {
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

// 그룹 목록 로딩 골격 (GRP-1). 헤더·세그먼트 칩은 실제로 렌더하고 목록 골격만 그린다(BT-2).
const GroupListSkeletonView: FC = () => {
  const opacity = useBreathingOpacity();

  return (
    <View style={styles.container}>
      {SKELETON_ROWS.map(index => (
        <View key={index} style={[styles.row, index > 0 && styles.divided]}>
          <Animated.View style={[styles.nameBar, { opacity }]} />
          <Animated.View style={[styles.metaBar, { opacity }]} />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  row: {
    minHeight: AcgRow.minHeight,
    justifyContent: 'center',
    gap: 4,
    paddingVertical: AcgRow.paddingVertical,
  },
  divided: {
    borderTopWidth: 1,
    borderTopColor: Acg.hairline,
  },
  nameBar: {
    width: 150,
    height: AcgType.rowTitle.lineHeight,
    backgroundColor: SKELETON_SHADE,
    borderRadius: 2,
  },
  metaBar: {
    width: 200,
    height: AcgType.rowSubtitle.lineHeight,
    backgroundColor: SKELETON_SHADE,
    borderRadius: 2,
  },
});

export default GroupListSkeletonView;
