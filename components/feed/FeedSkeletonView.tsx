import { FC, useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { Color, Radius, Spacing } from '@/constants/DesignTokens';

// FD-2: 피드 2컬럼 그리드용 스켈레톤. FeedCardView의 텍스트 카드 레이아웃(카드 면 위 브랜드/이름/색상/무게 바)과
// 동일한 형태로, FeedView의 셀 폭/간격(FEED_COLUMN_GAP / FEED_ROW_GAP)에 맞춰 정렬한다.
// 장비 이미지 미제공 원칙(DataModel §1)에 따라 정방형 이미지 자리는 두지 않는다.
// SearchSkeletonView와 동일한 은은한 펄스 애니메이션을 사용한다.

// FeedView의 컬럼 간격과 동일하게 유지한다(리스트 columnWrapper gap).
const FEED_COLUMN_GAP = 12;
const FEED_ROW_GAP = 24;
// FeedCardView의 담기 CTA 원형 크기와 동일하게 유지한다.
const CTA_SIZE = 36;
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
      {/* 카드 면 위 (브랜드 + CTA) 행 · 이름 · 색상 · 무게 바 — FeedCardView와 동일한 구조로 로딩→렌더 점프를 줄인다. */}
      <View style={styles.cardFace}>
        <View style={styles.cardHeader}>
          <Animated.View style={[styles.companyBar, { opacity }]} />
          <Animated.View style={[styles.ctaCircle, { opacity }]} />
        </View>
        <Animated.View style={[styles.nameBar, { opacity }]} />
        <Animated.View style={[styles.colorBar, { opacity }]} />
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
  // FeedCardView의 카드 면과 동일한 배경·모서리·패딩.
  cardFace: {
    width: '100%',
    borderRadius: Radius.card,
    backgroundColor: Color.inputBg,
    padding: Spacing.item,
    gap: 6,
  },
  // FeedCardView의 cardHeader(브랜드 좌 + CTA 우)와 동일한 한 행.
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  // 브랜드는 이름과 동일한 타이포(14/19)라 바 높이도 nameBar와 같게 둔다.
  companyBar: {
    width: '50%',
    height: 19,
    backgroundColor: PLACEHOLDER_COLOR,
    borderRadius: 2,
  },
  // 실제 카드의 담기 CTA(원형 36pt) 자리.
  ctaCircle: {
    width: CTA_SIZE,
    height: CTA_SIZE,
    borderRadius: CTA_SIZE / 2,
    backgroundColor: PLACEHOLDER_COLOR,
  },
  nameBar: {
    height: 19,
    width: '80%',
    backgroundColor: PLACEHOLDER_COLOR,
    borderRadius: 2,
  },
  // 실제 색상 텍스트의 lineHeight(16)와 맞춘다. 색상은 값이 있을 때만 렌더되는 줄이지만,
  // 대부분의 카드에 색상이 있어 바를 두는 쪽이 로딩→렌더 점프가 작다.
  colorBar: {
    height: 16,
    width: '40%',
    backgroundColor: PLACEHOLDER_COLOR,
    borderRadius: 2,
  },
  // 실제 무게 텍스트의 lineHeight(32)와 맞춘다.
  weightBar: {
    height: 32,
    width: '50%',
    backgroundColor: PLACEHOLDER_COLOR,
    borderRadius: 2,
  },
});

export default FeedSkeletonView;
