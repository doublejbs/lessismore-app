import { FC, useEffect, useState } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { Liquid, LiquidRadius } from '@/constants/DesignTokens';

// FD-2: 피드·검색 결과 2컬럼 그리드용 스켈레톤. FeedCardView의 텍스트 카드 레이아웃(카드 면 위
// 브랜드/이름/색상/무게 바)과 동일한 형태로, 리스트의 셀 폭/간격(COLUMN_GAP / ROW_GAP)에 맞춰 정렬한다.
// 장비 이미지 미제공 원칙(DataModel §1)에 따라 정방형 이미지 자리는 두지 않는다.

// FeedView·SearchResultContentView의 그리드 간격과 동일하게 유지한다.
const COLUMN_GAP = 12;
const ROW_GAP = 14;
// FeedCardView의 담기 CTA 원형 크기와 동일하게 유지한다.
const CTA_SIZE = 32;
// 셔머 반 주기 — 왕복 1.2s(핸드오프 로딩 규칙).
const SHIMMER_HALF_DURATION = 600;
// 스켈레톤 면은 가라앉은 타일, 그 위 바는 잉크 스케일의 가장 옅은 값을 쓴다.
// 바를 면과 같은 값으로 두면 지면(canvas) 위에서 형태가 사라진다.
const PLACEHOLDER_COLOR = Liquid.inkFaint;
const BAR_RADIUS = 4;

interface Props {
  count?: number; // 스켈레톤 카드 개수 (기본 6 = 3행 x 2열)
}

const SkeletonCard: FC = () => {
  // ref로 잡으면 렌더 중 `.current`를 읽어 React Compiler 룰(react-hooks/refs)에 걸린다.
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: SHIMMER_HALF_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: SHIMMER_HALF_DURATION,
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
    gap: COLUMN_GAP,
    marginBottom: ROW_GAP,
  },
  cell: {
    flex: 1,
    maxWidth: '50%',
  },
  // FeedCardView의 카드 면과 동일한 모서리·패딩. 면만 가라앉은 톤이다.
  cardFace: {
    width: '100%',
    borderRadius: LiquidRadius.card,
    backgroundColor: Liquid.surfaceSunken,
    padding: 16,
    gap: 4,
  },
  // FeedCardView의 cardHeader(브랜드 좌 + CTA 우)와 동일한 한 행.
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  // 브랜드 줄(12.5/17)과 같은 높이.
  companyBar: {
    width: '50%',
    height: 17,
    backgroundColor: PLACEHOLDER_COLOR,
    borderRadius: BAR_RADIUS,
  },
  // 실제 카드의 담기 CTA(원형 32pt) 자리.
  ctaCircle: {
    width: CTA_SIZE,
    height: CTA_SIZE,
    borderRadius: CTA_SIZE / 2,
    backgroundColor: PLACEHOLDER_COLOR,
  },
  // 제품명 줄(15/20)과 같은 높이.
  nameBar: {
    height: 20,
    width: '80%',
    backgroundColor: PLACEHOLDER_COLOR,
    borderRadius: BAR_RADIUS,
  },
  // 색상은 값이 있을 때만 렌더되는 줄이지만, 대부분의 카드에 색상이 있어 바를 두는 쪽이
  // 로딩→렌더 점프가 작다. 실제 줄의 lineHeight(16)와 맞춘다.
  colorBar: {
    height: 16,
    width: '40%',
    backgroundColor: PLACEHOLDER_COLOR,
    borderRadius: BAR_RADIUS,
  },
  // 무게는 콘덴스드 32/36 — 카드에서 가장 큰 덩어리라 바도 그만큼 둔다.
  weightBar: {
    height: 36,
    width: '50%',
    marginTop: 6,
    backgroundColor: PLACEHOLDER_COLOR,
    borderRadius: BAR_RADIUS,
  },
});

export default FeedSkeletonView;
