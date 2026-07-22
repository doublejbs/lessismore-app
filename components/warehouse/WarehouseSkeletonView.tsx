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
      <Animated.View style={[styles.skeletonImage, { opacity }]} />

      <View style={styles.skeletonContentSection}>
        <View style={styles.skeletonContentContainer}>
          <View style={styles.skeletonHeaderRow}>
            <View style={styles.skeletonInfoColumn}>
              <View style={styles.skeletonInfoContainer}>
                <View style={styles.skeletonCompanyRow}>
                  <Animated.View
                    style={[styles.skeletonCompanyText, { opacity }]}
                  />
                  <Animated.View
                    style={[styles.skeletonUsedRateBadge, { opacity }]}
                  />
                </View>

                <Animated.View style={[styles.skeletonNameText, { opacity }]} />
                <Animated.View
                  style={[styles.skeletonColorText, { opacity }]}
                />
              </View>

              <Animated.View style={[styles.skeletonWeightText, { opacity }]} />
            </View>
          </View>
        </View>
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
  skeletonContainer: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 0,
    gap: 12,
  },
  skeletonImage: {
    width: 80,
    height: 80,
    backgroundColor: Color.chipInactiveBg,
    borderRadius: 4,
    minWidth: 80,
  },
  skeletonContentSection: {
    flex: 1,
    overflow: 'hidden',
  },
  skeletonContentContainer: {
    flex: 1,
    gap: 10,
  },
  skeletonHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
  },
  skeletonInfoColumn: {
    flex: 1,
    gap: 7,
  },
  skeletonInfoContainer: {
    overflow: 'hidden',
    gap: 7,
  },
  skeletonCompanyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  skeletonCompanyText: {
    height: 12,
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
