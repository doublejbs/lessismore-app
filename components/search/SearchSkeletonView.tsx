import { FC, useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { Radius } from '@/constants/DesignTokens';

interface Props {
  count?: number; // 스켈레톤 아이템 개수
}

const SkeletonItem: FC = () => {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
      ]).start(() => animate());
    };

    animate();
  }, [opacity]);

  return (
    <View style={styles.skeletonItem}>
      {/* 텍스트 정보 영역 — 장비 썸네일이 없어 이미지 자리도 두지 않는다(DataModel §1) */}
      <View style={styles.contentSection}>
        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <View style={styles.infoColumn}>
              <View style={styles.infoContainer}>
                {/* 회사명 */}
                <Animated.View style={[styles.companyBar, { opacity }]} />

                {/* 제품명 */}
                <Animated.View style={[styles.nameBar, { opacity }]} />

                {/* 컬러 */}
                <Animated.View style={[styles.colorBar, { opacity }]} />
              </View>

              {/* 무게 */}
              <Animated.View style={[styles.weightBar, { opacity }]} />
            </View>
          </View>
        </View>
      </View>

      {/* 체크박스 영역 */}
      <View style={styles.checkboxSection}>
        <View style={styles.checkboxContainer}>
          <Animated.View style={[styles.checkboxBar, { opacity }]} />
        </View>
      </View>
    </View>
  );
};

const SearchSkeletonView: FC<Props> = ({ count = 5 }) => {
  const renderSkeletonItem = (index: number) => {
    return <SkeletonItem key={index} />;
  };

  return (
    <View style={styles.container}>
      {Array.from({ length: count }, (_, index) => renderSkeletonItem(index))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
  },
  skeletonItem: {
    flexDirection: 'row',
    paddingVertical: 14,
    gap: 12,
  },
  contentSection: {
    flex: 1,
    overflow: 'hidden',
  },
  contentContainer: {
    flex: 1,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
  },
  infoColumn: {
    flex: 1,
    gap: 7,
  },
  infoContainer: {
    overflow: 'hidden',
    gap: 7,
  },
  // 브랜드는 이름과 동일한 타이포라 바 높이도 nameBar와 같게 둔다.
  companyBar: {
    height: 14,
    width: 60,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
  },
  nameBar: {
    height: 14,
    width: 120,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
  },
  colorBar: {
    height: 14,
    width: 80,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
  },
  weightBar: {
    height: 14,
    width: 50,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
  },
  checkboxSection: {
    flexDirection: 'column',
    minWidth: 40,
    height: 80,
  },
  checkboxContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    flexShrink: 0,
  },
  checkboxBar: {
    width: 24,
    height: 24,
    backgroundColor: '#E0E0E0',
    borderRadius: Radius.listThumb,
  },
});

export default SearchSkeletonView;
