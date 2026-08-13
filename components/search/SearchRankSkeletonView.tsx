import { FC, useEffect, useState } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { Acg, AcgRow, AcgType } from '@/constants/DesignTokens';

interface Props {
  count?: number;
}

/**
 * SR-4 인기 장비 순위 로딩 스켈레톤.
 *
 * **검색 결과용 스켈레톤(`SearchSkeletonView`)을 쓰지 않는다** — 그쪽은 3줄 텍스트 + 무게 +
 * 체크 모양이라 실제로 그려질 순위 행과 구조가 달랐고, 데이터가 도착하는 순간 목록이 통째로
 * 뒤바뀌었다. 여기서는 순위 행(순위 원 + 이름 + 메타 + 우측 버튼)을 그대로 비춘다.
 * 치수는 `SearchTopKeywordsView`의 행 스타일과 같은 토큰(`AcgRow`·`AcgType`)에서 온다.
 */
const SkeletonRow: FC<{ divided: boolean }> = ({ divided }) => {
  // `useRef(...).current`가 아니라 `useState` 초기화로 잡는다 — 렌더 중 ref 접근은
  // 린트(react-hooks/refs)가 막는다. 애니메이션 값은 마운트당 하나면 된다.
  const [opacity] = useState(() => new Animated.Value(1));

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
    <View style={[styles.row, divided && styles.rowDivided]}>
      {/* 순위 원(28) */}
      <Animated.View style={[styles.rankCircle, { opacity }]} />

      {/* 이름 + 메타 한 줄 */}
      <View style={styles.info}>
        <Animated.View style={[styles.nameBar, { opacity }]} />
        <Animated.View style={[styles.metaBar, { opacity }]} />
      </View>

      {/* 우측 추가·보유 버튼(28) */}
      <Animated.View style={[styles.actionCircle, { opacity }]} />
    </View>
  );
};

const SearchRankSkeletonView: FC<Props> = ({ count = 10 }) => {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }, (_, index) => (
        <SkeletonRow key={index} divided={index > 0} />
      ))}
    </View>
  );
};

// 스켈레톤 셰이딩은 토큰 예외다(면·글자가 아니라 로딩 표시). 순백 지면 위 중성 회색 하나.
const SKELETON_SHADE = '#E8E8E8';
// 순위 원·우측 버튼 지름 — 실제 행의 `rankBadge`/`addButton`과 같은 값이다.
const CIRCLE_SIZE = 28;
// 막대 모서리. 글자 자리를 대신하는 것이라 면(12)이 아니라 아주 작게 둔다.
const BAR_RADIUS = 2;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: AcgRow.minHeight,
    paddingVertical: AcgRow.paddingVertical,
  },
  // 실제 목록과 같이 첫 행에는 구분선을 두지 않는다.
  rowDivided: {
    borderTopWidth: 1,
    borderTopColor: Acg.hairline,
  },
  rankCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    marginRight: 12,
    backgroundColor: SKELETON_SHADE,
  },
  info: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  nameBar: {
    height: AcgType.rowTitle.lineHeight,
    width: 140,
    borderRadius: BAR_RADIUS,
    backgroundColor: SKELETON_SHADE,
  },
  metaBar: {
    height: AcgType.rowSubtitle.lineHeight,
    width: 90,
    borderRadius: BAR_RADIUS,
    backgroundColor: SKELETON_SHADE,
  },
  actionCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: SKELETON_SHADE,
  },
});

export default SearchRankSkeletonView;
