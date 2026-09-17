import { FC } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Acg, AcgLayout, AcgRow, AcgType } from '@/constants/DesignTokens';
import useBreathingOpacity from '@/hooks/useBreathingOpacity';

const SKELETON_ROWS = [0, 1, 2];
const SKELETON_SHADE = '#E8E8E8';

// 그룹 상세 로딩 골격 (GRP-4). 헤더 한 덩이 + 멤버 행 세 줄만 그린다.
const GroupDetailSkeletonView: FC = () => {
  const opacity = useBreathingOpacity();

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.titleBar, { opacity }]} />
      <Animated.View style={[styles.metaBar, { opacity }]} />
      <Animated.View style={[styles.summaryBar, { opacity }]} />
      <View style={styles.rows}>
        {SKELETON_ROWS.map(index => (
          <View key={index} style={[styles.row, index > 0 && styles.divided]}>
            <Animated.View style={[styles.nameBar, { opacity }]} />
            <Animated.View style={[styles.metaBar, { opacity }]} />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 6,
  },
  titleBar: {
    width: 200,
    height: AcgType.screenTitle.lineHeight,
    backgroundColor: SKELETON_SHADE,
    borderRadius: 2,
  },
  metaBar: {
    width: 180,
    height: AcgType.rowSubtitle.lineHeight,
    backgroundColor: SKELETON_SHADE,
    borderRadius: 2,
  },
  summaryBar: {
    width: 220,
    height: AcgType.rowSubtitle.lineHeight,
    backgroundColor: SKELETON_SHADE,
    borderRadius: 2,
  },
  rows: {
    marginTop: AcgLayout.section,
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
});

export default GroupDetailSkeletonView;
