import { FC, useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { Acg } from '@/constants/DesignTokens';

// FD-2: 피드 2열 그리드용 스켈레톤(레퍼런스 이식). FeedGridCellView의 셀 구조(브랜드 /
// 이름+색상 2줄 자리 / 푸터[무게 | 담기 버튼])와 동일한 텍스트 폭 막대로, FeedView의 열·행 간격에 맞춰 정렬한다.
// 카드 면·테두리를 두지 않는다 — 실제 행도 순백 지면에 콘텐츠만 놓인다.
// 장비 이미지 미제공 원칙(DataModel §1)에 따라 사진 자리는 두지 않는다.
// SearchSkeletonView와 동일한 은은한 펄스 애니메이션을 사용한다.

// FeedView의 행 간격과 동일하게 유지한다(리스트 ItemSeparatorComponent).
const FEED_ROW_GAP = 24;
const FEED_COLUMN_GAP = 16;

// FeedGridCellView의 담기 버튼 원형 크기와 동일하게 유지한다.
const CTA_SIZE = 36;

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
      {/* 브랜드 · 이름(2줄 자리) · 푸터[무게 | 담기 원] — 실제 셀과 같은 구조로 로딩→렌더 점프를 줄인다. */}
      <Animated.View style={[styles.companyBar, { opacity }]} />
      <Animated.View style={[styles.nameBar, { opacity }]} />
      <View style={styles.footer}>
        <Animated.View style={[styles.weightBar, { opacity }]} />
        <Animated.View style={[styles.ctaCircle, { opacity }]} />
      </View>
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
    gap: 4,
  },
  footer: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
  },
  // 실제 이름 두 줄 자리(lineHeight 25 × 2)와 맞춘다.
  nameBar: {
    height: 50,
    backgroundColor: PLACEHOLDER_COLOR,
    borderRadius: 2,
  },
  ctaCircle: {
    width: CTA_SIZE,
    height: CTA_SIZE,
    borderRadius: CTA_SIZE / 2,
    backgroundColor: PLACEHOLDER_COLOR,
  },
  // 실제 브랜드 텍스트의 lineHeight(18)와 맞춘다.
  companyBar: {
    height: 18,
    width: '45%',
    backgroundColor: PLACEHOLDER_COLOR,
    borderRadius: 2,
  },
  // 셀의 앵커인 무게 — 실제 텍스트의 lineHeight(30)와 맞춘다.
  weightBar: {
    height: 30,
    width: '60%',
    backgroundColor: PLACEHOLDER_COLOR,
    borderRadius: 2,
  },
});

export default FeedSkeletonView;
