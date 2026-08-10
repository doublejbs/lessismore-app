import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import LiquidSkeletonBar from '@/components/liquid/LiquidSkeletonBar';
import useLiquidShimmer from '@/components/liquid/useLiquidShimmer';
import {
  Liquid,
  LiquidLayout,
  LiquidRadius,
  LiquidShadow,
} from '@/constants/DesignTokens';

/**
 * 배낭 목록 로딩 스켈레톤(BAG-1).
 *
 * 예전에는 가운데 스피너 하나였다. 스피너는 화면 정중앙에 뜨는데 실제 목록은 상단 헤더 +
 * 섹션 라벨 + 카드라, 데이터가 오는 순간 **구조가 통째로 바뀌며 덜컥거렸다.**
 * 스켈레톤은 들어올 화면과 같은 골격(제목·요약 → 섹션 라벨 → radius 22 카드)을 미리 그려
 * 그 이동을 없앤다. 핸드오프는 스피너를 쓰지 않는다.
 */
const CARD_COUNT = 3;

// 셔머 한 주기 1.2s(핸드오프 로딩 규칙) — 왕복이라 한 방향 600ms.
const SHIMMER_HALF_DURATION = 600;
const SHIMMER_MIN = 0.35;
const SHIMMER_MAX = 0.75;

// 이 스켈레톤의 셔머 폭은 다른 화면(1 ↔ 0.5)보다 좁다 — 값을 명시해 넘긴다.
const useShimmerOpacity = () =>
  useLiquidShimmer({
    from: SHIMMER_MIN,
    to: SHIMMER_MAX,
    halfDuration: SHIMMER_HALF_DURATION,
  });

/**
 * 도착할 카드와 같은 모양 — radius 22 흰 카드, 좌 [배지 · 이름 · 기간] / 우 [무게].
 *
 * 카드 안 자리는 `surfaceSunken`이 정본이지만 흰 면 위에서 셔머로 투명도를 내리면 거의
 * 사라져 빈 카드처럼 읽힌다 — 막대의 기본값(`inkFaint`)을 그대로 써서 한 단계 진하게 두고
 * 지면 위 헤더 자리와도 톤을 맞춘다.
 */
const SkeletonCard: FC = () => {
  const opacity = useShimmerOpacity();

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.identityColumn}>
          <LiquidSkeletonBar
            opacity={opacity}
            width={52}
            height={22}
            radius={11}
          />
          <LiquidSkeletonBar
            opacity={opacity}
            width='68%'
            height={17}
            radius={6}
          />
          <LiquidSkeletonBar
            opacity={opacity}
            width='84%'
            height={12.5}
            radius={6}
          />
        </View>
        <LiquidSkeletonBar
          opacity={opacity}
          width={64}
          height={30}
          radius={8}
        />
      </View>
    </View>
  );
};

const BagListSkeletonView: FC = () => {
  const opacity = useShimmerOpacity();

  return (
    <View style={styles.container}>
      {/* `배낭` 제목 + `N개 · 평균 N.Nkg` 요약 · 우측 정렬 드롭다운 자리 */}
      <View style={styles.header}>
        <View style={styles.headerIdentity}>
          {/* 실제 헤더의 라인박스(제목 lineHeight 38, 요약 ~17)와 같은 높이 — 로딩 해제 시 튀지 않게. */}
          <LiquidSkeletonBar
            opacity={opacity}
            width={96}
            height={38}
            radius={8}
          />
          <LiquidSkeletonBar
            opacity={opacity}
            width={132}
            height={17}
            radius={6}
          />
        </View>
        <LiquidSkeletonBar
          opacity={opacity}
          width={78}
          height={16}
          radius={8}
        />
      </View>

      <LiquidSkeletonBar
        opacity={opacity}
        width={64}
        height={16}
        radius={5}
        style={styles.sectionLabelBar}
      />

      {[...Array(CARD_COUNT)].map((_unused, index) => (
        <SkeletonCard key={index} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 18,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerIdentity: {
    gap: 8,
  },
  sectionLabelBar: {
    marginTop: 24,
    marginBottom: 10,
  },
  card: {
    padding: 18,
    marginBottom: LiquidLayout.listGap,
    borderRadius: LiquidRadius.card,
    backgroundColor: Liquid.surface,
    boxShadow: LiquidShadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  identityColumn: {
    flex: 1,
    gap: 8,
  },
});

export default BagListSkeletonView;
