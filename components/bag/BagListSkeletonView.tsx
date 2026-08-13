import { FC, useEffect, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Acg, AcgRadius, AcgRow, AcgType } from '@/constants/DesignTokens';

/**
 * 배낭 목록 로딩 스켈레톤(BAG-1).
 *
 * 예전에는 가운데 스피너 하나였다. 스피너는 화면 정중앙에 뜨는데 실제 목록은 상단 헤더 +
 * 항목 목록이라, 데이터가 오는 순간 **구조가 통째로 바뀌며 덜컥거렸다.**
 * 스켈레톤은 들어올 화면과 같은 골격(헤더 행 + 배낭 카드)을 미리 그려 그 이동을 없앤다.
 * 창고(WH-1)·피드가 쓰는 방식과 같다.
 *
 * **카드 골격이다**(2026-08-13, BAG-1 카드 문법). 지도 밴드 자리는 그리지 않는다 — 어떤 배낭에
 * 여행지가 있는지 로딩 중에는 알 수 없고, 없는 배낭에 밴드 자리를 그리면 데이터가 온 순간
 * 카드가 오히려 더 크게 줄어든다.
 */
const CARD_COUNT = 5;

// 카드 사이 간격·좌우 패딩은 실제 카드(BagItemView)와 같은 값이다.
const CARD_GAP = 12;
const CARD_PADDING_HORIZONTAL = 16;

/**
 * 카드 면(`Acg.controlFill`) 위에 놓이는 막대색. 면과 같은 값이면 막대가 보이지 않아
 * 한 단 진한 회색을 쓴다 — 스켈레톤 셰이딩은 토큰 예외다(CLAUDE.md).
 */
const SKELETON_BAR = '#E3E3E3';

const useBreathingOpacity = () => {
  // `useRef(...).current`를 렌더 중 읽으면 react-hooks 규칙에 걸린다 — 초기화 함수로 1회만 만든다.
  const [opacity] = useState(() => new Animated.Value(0.3));

  useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start(() => animate());
    };

    animate();
  }, [opacity]);

  return opacity;
};

// 배낭 카드: 이름 + 메타 한 줄(무게 · 기간 · 패킹). 실제 카드(BagItemView)와 같은 배치다.
const SkeletonCard: FC = () => {
  const opacity = useBreathingOpacity();

  return (
    <View style={styles.card}>
      <View style={styles.identityColumn}>
        <Animated.View style={[styles.nameBar, { opacity }]} />
        <Animated.View style={[styles.metaBar, { opacity }]} />
      </View>
    </View>
  );
};

const BagListSkeletonView: FC = () => {
  const opacity = useBreathingOpacity();

  return (
    <View style={styles.container}>
      {/* `배낭 N개` + 정렬 드롭다운 자리 */}
      <View style={styles.header}>
        <Animated.View style={[styles.headerTitleBar, { opacity }]} />
        <Animated.View style={[styles.headerOrderBar, { opacity }]} />
      </View>

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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 16,
  },
  // 막대 높이는 실제 글자의 줄박스에서 그대로 딴다 — 값이 갈리면 데이터가 오는 순간 행이 튄다.
  headerTitleBar: {
    width: 160,
    height: AcgType.screenTitle.lineHeight,
    borderRadius: 2,
    backgroundColor: Acg.controlFill,
  },
  headerOrderBar: {
    width: 84,
    height: AcgType.control.lineHeight,
    borderRadius: 2,
    backgroundColor: Acg.controlFill,
  },
  // 실제 카드와 같은 면·모서리·치수(AcgRow) + 간격. 헤어라인은 카드 문법에 없다.
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: AcgRow.minHeight,
    paddingVertical: AcgRow.paddingVertical,
    paddingHorizontal: CARD_PADDING_HORIZONTAL,
    marginBottom: CARD_GAP,
    backgroundColor: Acg.controlFill,
    borderRadius: AcgRadius.thumb,
  },
  identityColumn: {
    gap: 4,
  },
  // 이름(rowTitle) / 메타(rowSubtitle) 두 단.
  nameBar: {
    width: 170,
    height: AcgType.rowTitle.lineHeight,
    borderRadius: 2,
    backgroundColor: SKELETON_BAR,
  },
  metaBar: {
    width: 220,
    height: AcgType.rowSubtitle.lineHeight,
    borderRadius: 2,
    backgroundColor: SKELETON_BAR,
  },
});

export default BagListSkeletonView;
