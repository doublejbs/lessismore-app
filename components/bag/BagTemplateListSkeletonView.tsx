import { FC, useEffect, useState } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import { Acg, AcgRow, AcgType } from '@/constants/DesignTokens';

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

const BagTemplateListSkeletonView: FC = () => {
  const opacity = useBreathingOpacity();

  return (
    <View style={styles.container}>
      {[0, 1, 2, 3].map(index => (
        <View key={index} style={[styles.row, index > 0 && styles.divided]}>
          <View style={styles.body}>
            <Animated.View style={[styles.nameBar, { opacity }]} />
            <Animated.View style={[styles.metaBar, { opacity }]} />
          </View>
          <Animated.View style={[styles.menuBar, { opacity }]} />
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
    flexDirection: 'row',
  },
  divided: {
    borderTopWidth: 1,
    borderTopColor: Acg.hairline,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
    paddingVertical: AcgRow.paddingVertical,
  },
  nameBar: {
    width: 150,
    height: AcgType.rowTitle.lineHeight,
    backgroundColor: '#E3E3E3',
    borderRadius: 2,
  },
  metaBar: {
    width: 120,
    height: AcgType.rowSubtitle.lineHeight,
    backgroundColor: '#E3E3E3',
    borderRadius: 2,
  },
  menuBar: {
    width: 44,
  },
});

export default BagTemplateListSkeletonView;
