import { FC, useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { Acg, AcgRadius } from '@/constants/DesignTokens';

// FD-2: 피드 2열 그리드용 스켈레톤(레퍼런스 이식). FeedGridCellView와 같은 면 하나짜리
// 덩어리로, FeedView의 열·행 간격에 맞춰 정렬한다.
// 장비 이미지 미제공 원칙(DataModel §1)에 따라 썸네일 자리에는 사진이 아니라 브랜드·제품명이
// 들어가지만, 로딩 중에는 그 면만 비워 두면 실제 셀과 덩어리가 같아진다.
// SearchSkeletonView와 동일한 은은한 펄스 애니메이션을 사용한다.

// FeedGridCellView의 면 최소 높이와 동일하게 유지한다.
const THUMB_MIN_HEIGHT = 150;

// FeedView의 행 간격과 동일하게 유지한다(리스트 ItemSeparatorComponent).
const FEED_ROW_GAP = 24;
const FEED_COLUMN_GAP = 16;

const PLACEHOLDER_COLOR = Acg.controlFill;

interface Props {
  count?: number; // 스켈레톤 셀 개수 (기본 6 = 3행 × 2열)
}

const SkeletonCell: FC = () => {
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
      {/* 면 하나 — 실제 셀도 정보를 면 안에 다 담으므로 로딩 중에는 그 면만 비워 둔다. */}
      <Animated.View style={[styles.thumb, { opacity }]} />
    </View>
  );
};

const FeedSkeletonView: FC<Props> = ({ count = 6 }) => {
  // 2열씩 끊어 행으로 렌더한다 — FlatList의 columnWrapperStyle과 같은 간격으로 맞춘다.
  const rowCount = Math.ceil(count / 2);

  return (
    <View style={styles.grid}>
      {Array.from({ length: rowCount }, (_, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          <SkeletonCell />
          {rowIndex * 2 + 1 < count ? (
            <SkeletonCell />
          ) : (
            <View style={styles.cell} />
          )}
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
  },
  // 실제 면의 최소 높이·모서리와 같게 둔다.
  thumb: {
    flex: 1,
    minHeight: THUMB_MIN_HEIGHT,
    backgroundColor: PLACEHOLDER_COLOR,
    borderRadius: AcgRadius.thumb,
  },
});

export default FeedSkeletonView;
