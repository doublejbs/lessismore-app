import { FC, useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Acg, AcgLayout, AcgRow } from '@/constants/DesignTokens';

interface Props {}

const BagDetailSkeletonView: FC<Props> = () => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();
    return () => pulseAnimation.stop();
  }, [pulseAnim]);

  const SkeletonBox = ({
    width,
    height,
  }: {
    width: number | string;
    height: number;
  }) => {
    const widthValue = typeof width === 'string' ? (width as any) : width;
    return (
      <View style={[styles.skeletonBox, { width: widthValue, height }]}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { opacity: pulseAnim, backgroundColor: SKELETON_SHADE },
          ]}
        />
      </View>
    );
  };

  // BD-1: 썸네일은 사용자가 올린 사진이 있는 행에만 붙고 대다수 장비에는 없으므로,
  // 로딩 자리는 기본 모습인 텍스트 우선 행에 맞춘다(썸네일 박스를 두면 대부분의 행과 어긋난다).
  const renderGearSkeletonItem = (index: number) => {
    return (
      <View key={index} style={styles.gearItem}>
        <View style={styles.gearInfo}>
          {/* 실제 행은 이름(19) + 메타 한 줄(15)이다. */}
          <SkeletonBox width='70%' height={22} />
          <SkeletonBox width='55%' height={18} />
        </View>
      </View>
    );
  };

  const renderCategorySkeleton = (index: number) => {
    return (
      <View key={index} style={styles.category}>
        <SkeletonBox width={120} height={18} />
        {Array.from({ length: 3 }, (_, itemIndex) =>
          renderGearSkeletonItem(itemIndex)
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <SkeletonBox width={24} height={24} />
        <View style={styles.headerRight}>
          <SkeletonBox width={60} height={24} />
          <SkeletonBox width={24} height={24} />
        </View>
      </View>

      {/* 메인 콘텐츠 */}
      <View style={styles.mainContent}>
        {/* 백팩 정보 */}
        <View style={styles.bagInfo}>
          <SkeletonBox width='80%' height={24} />
          <SkeletonBox width='60%' height={18} />
        </View>

        {/* 설명 영역 */}
        <View style={styles.description}>
          <SkeletonBox width='100%' height={16} />
          <SkeletonBox width='70%' height={16} />
        </View>

        {/* 필터 영역 */}
        <View style={styles.filterSection}>
          <SkeletonBox width={120} height={18} />
          <View style={styles.filterButtons}>
            {Array.from({ length: 5 }, (_, index) => (
              <SkeletonBox key={index} width={80} height={32} />
            ))}
          </View>
        </View>

        {/* 장비 리스트 */}
        <View style={styles.gearList}>
          {Array.from({ length: 4 }, (_, index) =>
            renderCategorySkeleton(index)
          )}
        </View>
      </View>
    </View>
  );
};

// 스켈레톤 셰이딩은 토큰 예외다. 순백 지면 위에서 튀지 않는 중성 회색
// (지면이 흰색이 되면서 옛 따뜻한 회색 #E3E1DA는 누렇게 떴다).
const SKELETON_SHADE = '#E8E8E8';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // 들어올 화면과 같은 순백 지면.
    backgroundColor: Acg.paper,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 60, // Status bar 고려
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  mainContent: {
    flex: 1,
  },
  bagInfo: {
    padding: 16,
    paddingHorizontal: AcgLayout.screenPadding,
    gap: 12,
  },
  description: {
    padding: 16,
    paddingHorizontal: AcgLayout.screenPadding,
    gap: 8,
  },
  filterSection: {
    padding: 15,
    paddingHorizontal: AcgLayout.screenPadding,
    gap: 12,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  gearList: {
    padding: 16,
    paddingHorizontal: AcgLayout.screenPadding,
    paddingBottom: 96,
    gap: 20,
  },
  category: {
    gap: 2,
  },
  // 실제 행과 같은 치수(AcgRow) + 행 사이 헤어라인.
  gearItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: AcgRow.minHeight,
    paddingVertical: AcgRow.paddingVertical,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Acg.hairline,
  },
  gearInfo: {
    flex: 1,
    gap: 4,
  },
  skeletonBox: {
    borderRadius: 2,
    overflow: 'hidden',
  },
});

export default BagDetailSkeletonView;
