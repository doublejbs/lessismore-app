import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import LiquidSkeletonBar from '@/components/liquid/LiquidSkeletonBar';
import useLiquidShimmer from '@/components/liquid/useLiquidShimmer';
import { Liquid, LiquidLayout, LiquidRadius } from '@/constants/DesignTokens';

/**
 * 홈 로딩 스켈레톤(HM-6).
 *
 * 가운데 스피너를 쓰지 않는다 — 스피너는 화면 정중앙인데 실제 홈은 상단 타이틀 +
 * 카드 두 장이라, 데이터가 오는 순간 구조가 통째로 바뀌며 덜컥거린다.
 * 창고(WH-1)·배낭(BAG-1)이 쓰는 방식과 같다.
 *
 * Liquid Depth: 셔머 면은 `surfaceSunken`, 골격은 실제 화면과 같은 라운드를 쓴다 —
 * 스켈레톤이 각지면 데이터가 도착하는 순간 모서리가 둥글어지며 덜컥거린다.
 */
const PREVIEW_ROWS = 4;

/**
 * 이 화면의 셔머는 다른 스켈레톤보다 느리고(반 주기 800ms) 폭도 다르다 — 홈은 카드 두 장뿐인
 * 큰 덩어리라 빠른 맥박이 눈에 튄다.
 */
const SHIMMER_FROM = 0.3;
const SHIMMER_TO = 0.7;
const SHIMMER_HALF_DURATION = 800;
// 셔머 면은 전부 surfaceSunken 하나로 통일한다 — 종이 면(#FFF) 위에서 충분히 읽힌다.
const SHIMMER_COLOR = Liquid.surfaceSunken;

const HomeSkeletonView: FC = () => {
  const opacity = useLiquidShimmer({
    from: SHIMMER_FROM,
    to: SHIMMER_TO,
    halfDuration: SHIMMER_HALF_DURATION,
  });

  const renderSectionTitle = () => (
    <LiquidSkeletonBar
      opacity={opacity}
      width={96}
      height={20}
      radius={LiquidRadius.tile}
      color={SHIMMER_COLOR}
      style={styles.sectionTitleBar}
    />
  );

  return (
    <View style={styles.container}>
      {/* 다가오는 일정 카드 자리 */}
      {renderSectionTitle()}
      <View style={styles.tile}>
        <LiquidSkeletonBar
          opacity={opacity}
          width={52}
          height={24}
          radius={LiquidRadius.card}
          color={SHIMMER_COLOR}
          style={styles.badgeBar}
        />
        <LiquidSkeletonBar
          opacity={opacity}
          width={170}
          height={26}
          radius={LiquidRadius.tile}
          color={SHIMMER_COLOR}
          style={styles.titleBar}
        />
        <LiquidSkeletonBar
          opacity={opacity}
          width={210}
          height={16}
          radius={LiquidRadius.tile}
          color={SHIMMER_COLOR}
        />
        <LiquidSkeletonBar
          opacity={opacity}
          height={56}
          radius={LiquidRadius.tile}
          color={SHIMMER_COLOR}
          style={styles.statsBar}
        />
        <LiquidSkeletonBar
          opacity={opacity}
          height={50}
          radius={LiquidRadius.card}
          color={SHIMMER_COLOR}
          style={styles.ctaBar}
        />
      </View>

      {/* 창고 미리보기 카드 자리 */}
      {renderSectionTitle()}
      <View style={styles.list}>
        <LiquidSkeletonBar
          opacity={opacity}
          height={34}
          radius={LiquidRadius.pill}
          color={SHIMMER_COLOR}
        />
        {[...Array(PREVIEW_ROWS)].map((_unused, index) => (
          <View key={index} style={styles.gearRow}>
            <LiquidSkeletonBar
              opacity={opacity}
              width={150}
              height={16}
              radius={LiquidRadius.tile}
              color={SHIMMER_COLOR}
            />
            <LiquidSkeletonBar
              opacity={opacity}
              width={44}
              height={14}
              radius={LiquidRadius.tile}
              color={SHIMMER_COLOR}
            />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionTitleBar: {
    marginBottom: 10,
  },
  // 들어올 화면과 같은 골격이어야 덜컥거리지 않는다 — 일정은 회색 타일, 창고는 평평한 목록.
  // 모서리는 도착할 히어로 카드와 같은 토큰(`sheet` 28)을 읽는다.
  tile: {
    backgroundColor: Liquid.surface,
    borderRadius: LiquidRadius.sheet,
    padding: 20,
    marginBottom: LiquidLayout.section,
  },
  list: {
    marginBottom: LiquidLayout.section,
  },
  badgeBar: {
    marginBottom: 10,
  },
  titleBar: {
    marginBottom: 8,
  },
  statsBar: {
    marginTop: 16,
  },
  ctaBar: {
    marginTop: 16,
  },
  gearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Liquid.hairline,
  },
});

export default HomeSkeletonView;
