import { FC, useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Acg, AcgLayout } from '@/constants/DesignTokens';

interface Props {}

const WarehouseDetailSkeletonView: FC<Props> = ({}) => {
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const SkeletonBox: FC<{ style?: any }> = ({ style }) => (
    <Animated.View
      style={[
        {
          // 스켈레톤 셰이딩은 토큰 예외다. 지면(#F4F3EF) 위라 기존 회색은 푸르게 떠 보였다.
          backgroundColor: SKELETON_SHADE,
          opacity: fadeAnim,
        },
        style,
      ]}
    />
  );

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.5,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();

    return () => pulseAnimation.stop();
  }, [fadeAnim]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SkeletonBox style={styles.headerIcon} />
      </View>

      <View style={styles.content}>
        {/* 기어 이미지 스켈레톤 */}
        <SkeletonBox style={styles.gearImage} />

        {/* 기어 정보 스켈레톤 */}
        <View style={styles.gearInfoSection}>
          {/* 제목 */}
          <SkeletonBox style={styles.titleSkeleton} />

          {/* 설명 라인들 */}
          <SkeletonBox style={styles.descriptionLine1} />
          <SkeletonBox style={styles.descriptionLine2} />
          <SkeletonBox style={styles.descriptionLine3} />
        </View>

        {/* 백 기록 섹션 스켈레톤 */}
        <View style={styles.bagSection}>
          <SkeletonBox style={styles.bagSectionTitle} />

          {/* 백 리스트 아이템들 */}
          {[1, 2, 3].map(item => (
            <View key={item} style={styles.bagItem}>
              <SkeletonBox style={styles.bagItemIcon} />
              <View style={styles.bagItemContent}>
                <SkeletonBox style={styles.bagItemTitle} />
                <SkeletonBox style={styles.bagItemSubtitle} />
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* 하단 버튼들 스켈레톤 */}
      <View style={styles.bottomButtons}>
        <SkeletonBox style={styles.bottomButton} />
        <SkeletonBox style={styles.bottomButton} />
      </View>
    </View>
  );
};

// 스켈레톤 셰이딩은 토큰 예외다(면·글자가 아니라 로딩 표시). 순백 지면 위 중성 회색 하나로 통일한다.
const SKELETON_SHADE = '#E8E8E8';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Acg.bg,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 7,
    paddingHorizontal: AcgLayout.screenH,
    position: 'absolute',
    top: 0,
    zIndex: 1,
    backgroundColor: 'transparent',
  },
  headerIcon: {
    width: 25,
    height: 24,
  },
  content: {
    flexDirection: 'column',
    paddingHorizontal: AcgLayout.screenH,
    marginTop: 46,
    paddingBottom: 100,
  },
  gearImage: {
    width: '100%',
    height: 200,
    marginBottom: 16,
  },
  gearInfoSection: {
    marginBottom: 24,
  },
  titleSkeleton: {
    width: '80%',
    height: 24,
    marginBottom: 12,
  },
  descriptionLine1: {
    width: '60%',
    height: 16,
    marginBottom: 8,
  },
  descriptionLine2: {
    width: '40%',
    height: 16,
    marginBottom: 8,
  },
  descriptionLine3: {
    width: '50%',
    height: 16,
  },
  bagSection: {
    // 백 섹션 컨테이너
  },
  bagSectionTitle: {
    width: '30%',
    height: 20,
    marginBottom: 16,
  },
  bagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 12,
    backgroundColor: Acg.paper,
  },
  bagItemIcon: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  bagItemContent: {
    flex: 1,
  },
  bagItemTitle: {
    width: '70%',
    height: 16,
    marginBottom: 6,
  },
  bagItemSubtitle: {
    width: '50%',
    height: 14,
  },
  bottomButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: Acg.paper,
  },
  bottomButton: {
    flex: 1,
    height: 54,
  },
});

export default observer(WarehouseDetailSkeletonView);
