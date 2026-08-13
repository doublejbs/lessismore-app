import { FC, useEffect, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Acg, AcgRadius, AcgRow, AcgType } from '@/constants/DesignTokens';

/**
 * 배낭 목록 로딩 스켈레톤(BAG-1).
 *
 * 예전에는 가운데 스피너 하나였다. 스피너는 화면 정중앙에 뜨는데 실제 목록은 상단 헤더 +
 * 항목 목록이라, 데이터가 오는 순간 **구조가 통째로 바뀌며 덜컥거렸다.**
 * 스켈레톤은 들어올 화면과 같은 목록 골격(배낭 카드)을 미리 그려 그 이동을 없앤다.
 * 창고(WH-1)·피드가 쓰는 방식과 같다.
 *
 * **카드 골격이다**(2026-08-13, BAG-1 카드 문법). **지도 밴드 자리까지 그린다** — 어떤 배낭에
 * 여행지가 있는지 로딩 중에는 알 수 없어 어느 쪽이든 한 번은 어긋나는데, 실사용 배낭은 대부분
 * 여행지를 가지므로 밴드 없는 낮은 골격을 두면 데이터가 오는 순간 카드마다 110pt씩 늘어나
 * 목록 전체가 크게 밀린다. 반대 방향(밴드 자리를 그렸는데 여행지가 없어 줄어드는 것)은 소수
 * 카드에서만 일어나 어긋남이 더 작다.
 */
const CARD_COUNT = 5;

// 카드 사이 간격·좌우 패딩·밴드 높이는 실제 카드(BagItemView)와 같은 값이다.
const CARD_GAP = 12;
const CARD_PADDING_HORIZONTAL = 16;
const MAP_BAND_HEIGHT = 110;

/**
 * 카드 면(`Acg.controlFill`) 위에 놓이는 막대색. 면과 같은 값이면 막대가 보이지 않아
 * 한 단 진한 회색을 쓴다 — 스켈레톤 셰이딩은 토큰 예외다(CLAUDE.md).
 */
const SKELETON_BAR = '#E3E3E3';

/**
 * 지도 밴드 자리. 카드 폭을 통째로 채우는 면이라 막대와 같은 값이면 카드가 위아래로 갈린 것처럼
 * 보이지 않는다 — 막대보다 한 단 더 진하게 두어 "여기에 이미지가 들어온다"를 알린다.
 */
const SKELETON_BAND = '#DCDCDC';

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

// 배낭 카드: 지도 밴드 자리 + 이름 + 메타 한 줄. 실제 카드(BagItemView)와 같은 배치다.
const SkeletonCard: FC = () => {
  const opacity = useBreathingOpacity();

  return (
    <View style={styles.card}>
      <Animated.View style={[styles.mapBand, { opacity }]} />

      <View style={styles.body}>
        <Animated.View style={[styles.nameBar, { opacity }]} />
        <Animated.View style={[styles.metaBar, { opacity }]} />
      </View>
    </View>
  );
};

const BagListSkeletonView: FC = () => {
  return (
    <View style={styles.container}>
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
  // 실제 카드와 같은 면·모서리·간격. 헤어라인은 카드 문법에 없다.
  card: {
    marginBottom: CARD_GAP,
    backgroundColor: Acg.controlFill,
    borderRadius: AcgRadius.thumb,
    // 밴드 자리의 위쪽 모서리를 카드 모서리로 깎는다(실제 카드와 같은 방식).
    overflow: 'hidden',
  },
  mapBand: {
    width: '100%',
    height: MAP_BAND_HEIGHT,
    backgroundColor: SKELETON_BAND,
  },
  // 본문 치수(AcgRow)와 좌우 패딩도 실제 카드와 같다 — 값이 갈리면 데이터가 올 때 카드가 튄다.
  body: {
    justifyContent: 'center',
    gap: 4,
    minHeight: AcgRow.minHeight,
    paddingVertical: AcgRow.paddingVertical,
    paddingHorizontal: CARD_PADDING_HORIZONTAL,
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
