import { FC, useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { Color, Radius } from '@/constants/DesignTokens';

// FD-2: 피드 2컬럼 그리드용 스켈레톤. FeedCardView 레이아웃(정방형 이미지 + 브랜드/이름/무게 바)과
// 동일한 형태로, FeedView의 셀 폭/간격(FEED_COLUMN_GAP / FEED_ROW_GAP)에 맞춰 정렬한다.
// SearchSkeletonView와 동일한 은은한 펄스 애니메이션을 사용한다.

// FeedView의 컬럼 간격과 동일하게 유지한다(리스트 columnWrapper gap).
const FEED_COLUMN_GAP = 12;
const FEED_ROW_GAP = 24;
const PLACEHOLDER_COLOR = Color.chipInactiveBg;

interface Props {
  count?: number; // 스켈레톤 카드 개수 (기본 6 = 3행 x 2열)
}

const SkeletonCard: FC = () => {
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
    <View style={styles.cell}>
      {/* 정방형 이미지 자리 */}
      <Animated.View style={[styles.image, { opacity }]} />

      {/* 브랜드 · 이름 · 무게 바 */}
      <View style={styles.info}>
        <Animated.View style={[styles.companyBar, { opacity }]} />
        <Animated.View style={[styles.nameBar, { opacity }]} />
        <Animated.View style={[styles.weightBar, { opacity }]} />
      </View>
    </View>
  );
};

const FeedSkeletonView: FC<Props> = ({ count = 6 }) => {
  // 2열씩 끊어 행으로 렌더한다. 각 행은 FlatList의 columnWrapperStyle(gap + marginBottom)과 동일하게 정렬한다.
  const rowCount = Math.ceil(count / 2);

  return (
    <View style={styles.grid}>
      {Array.from({ length: rowCount }, (_, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          <SkeletonCard />
          {rowIndex * 2 + 1 < count ? <SkeletonCard /> : <View style={styles.cell} />}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'column',
  },
  row: {
    flexDirection: 'row',
    gap: FEED_COLUMN_GAP,
    marginBottom: FEED_ROW_GAP,
  },
  cell: {
    flex: 1,
    maxWidth: '50%',
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Radius.card,
    backgroundColor: PLACEHOLDER_COLOR,
  },
  info: {
    paddingTop: 8,
    gap: 6,
  },
  companyBar: {
    height: 10,
    width: '40%',
    backgroundColor: PLACEHOLDER_COLOR,
    borderRadius: 2,
  },
  nameBar: {
    height: 14,
    width: '80%',
    backgroundColor: PLACEHOLDER_COLOR,
    borderRadius: 2,
  },
  weightBar: {
    height: 12,
    width: '30%',
    backgroundColor: PLACEHOLDER_COLOR,
    borderRadius: 2,
  },
});

export default FeedSkeletonView;
