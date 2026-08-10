import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import LiquidSkeletonBar from '@/components/liquid/LiquidSkeletonBar';
import useLiquidShimmer from '@/components/liquid/useLiquidShimmer';
import { Liquid, LiquidRadius } from '@/constants/DesignTokens';

// FD-2: 피드·검색 결과 2컬럼 그리드용 스켈레톤. FeedCardView의 텍스트 카드 레이아웃(카드 면 위
// 브랜드/이름/색상/무게 바)과 동일한 형태로, 리스트의 셀 폭/간격(COLUMN_GAP / ROW_GAP)에 맞춰 정렬한다.
// 장비 이미지 미제공 원칙(DataModel §1)에 따라 정방형 이미지 자리는 두지 않는다.

// FeedView·SearchResultContentView의 그리드 간격과 동일하게 유지한다.
const COLUMN_GAP = 12;
const ROW_GAP = 14;
// FeedCardView의 담기 CTA 원형 크기와 동일하게 유지한다. 원이라 모서리는 지름의 절반이다.
const CTA_SIZE = 32;

interface Props {
  count?: number; // 스켈레톤 카드 개수 (기본 6 = 3행 x 2열)
}

const SkeletonCard: FC = () => {
  // 셔머·막대 색·모서리 모두 기본값(1 ↔ 0.5 / 반 주기 600ms / inkFaint / 4)을 그대로 쓴다.
  const opacity = useLiquidShimmer();

  return (
    <View style={styles.cell}>
      {/* 카드 면 위 (브랜드 + CTA) 행 · 이름 · 색상 · 무게 바 — FeedCardView와 동일한 구조로 로딩→렌더 점프를 줄인다. */}
      <View style={styles.cardFace}>
        <View style={styles.cardHeader}>
          {/* 브랜드 줄(12.5/17)과 같은 높이. */}
          <LiquidSkeletonBar opacity={opacity} width='50%' height={17} />
          <LiquidSkeletonBar
            opacity={opacity}
            width={CTA_SIZE}
            height={CTA_SIZE}
            radius={CTA_SIZE / 2}
          />
        </View>
        {/* 제품명 줄(15/20)과 같은 높이. */}
        <LiquidSkeletonBar opacity={opacity} width='80%' height={20} />
        {/*
          색상은 값이 있을 때만 렌더되는 줄이지만, 대부분의 카드에 색상이 있어 바를 두는 쪽이
          로딩→렌더 점프가 작다. 실제 줄의 lineHeight(16)와 맞춘다.
        */}
        <LiquidSkeletonBar opacity={opacity} width='40%' height={16} />
        {/* 무게는 콘덴스드 32/36 — 카드에서 가장 큰 덩어리라 바도 그만큼 둔다. */}
        <LiquidSkeletonBar
          opacity={opacity}
          width='50%'
          height={36}
          style={styles.weightBar}
        />
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
          {rowIndex * 2 + 1 < count ? (
            <SkeletonCard />
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
  weightBar: {
    marginTop: 6,
  },
});

export default FeedSkeletonView;
