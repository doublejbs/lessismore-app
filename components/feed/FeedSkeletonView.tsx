import { FC, useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { Acg } from '@/constants/DesignTokens';

// FD-2: 피드 단일 컬럼 목록용 스켈레톤(레퍼런스 이식). FeedRowView의 행 구조(이름 + 담기 버튼 /
// 브랜드 / 메타)와 동일한 텍스트 폭 막대로, FeedView의 행 간격(FEED_ROW_GAP)에 맞춰 정렬한다.
// 카드 면·테두리를 두지 않는다 — 실제 행도 순백 지면에 콘텐츠만 놓인다.
// 장비 이미지 미제공 원칙(DataModel §1)에 따라 사진 자리는 두지 않는다.
// SearchSkeletonView와 동일한 은은한 펄스 애니메이션을 사용한다.

// FeedView의 행 간격과 동일하게 유지한다(리스트 ItemSeparatorComponent).
const FEED_ROW_GAP = 24;

// FeedRowView의 담기 버튼 원형 크기와 동일하게 유지한다.
const CTA_SIZE = 36;

const PLACEHOLDER_COLOR = Acg.controlFill;

interface Props {
  count?: number; // 스켈레톤 행 개수 (기본 5)
}

const SkeletonRow: FC = () => {
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
    <View style={styles.row}>
      {/* (이름 + 담기 버튼) 행 · 브랜드 · 메타 — FeedRowView와 동일한 구조로 로딩→렌더 점프를 줄인다. */}
      <View style={styles.titleRow}>
        <Animated.View style={[styles.nameBar, { opacity }]} />
        <Animated.View style={[styles.ctaCircle, { opacity }]} />
      </View>
      <Animated.View style={[styles.companyBar, { opacity }]} />
      <Animated.View style={[styles.metaBar, { opacity }]} />
    </View>
  );
};

const FeedSkeletonView: FC<Props> = ({ count = 5 }) => {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }, (_, index) => (
        <SkeletonRow key={index} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  list: {
    flexDirection: 'column',
    gap: FEED_ROW_GAP,
  },
  row: {
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  // 실제 이름 텍스트의 lineHeight(30)와 맞춘다 — 행의 앵커라 가장 넓은 막대다.
  nameBar: {
    flex: 1,
    height: 25,
    backgroundColor: PLACEHOLDER_COLOR,
    borderRadius: 2,
  },
  ctaCircle: {
    width: CTA_SIZE,
    height: CTA_SIZE,
    borderRadius: CTA_SIZE / 2,
    backgroundColor: PLACEHOLDER_COLOR,
  },
  // 실제 브랜드 텍스트의 lineHeight(25)와 맞춘다.
  companyBar: {
    height: 20,
    width: '45%',
    backgroundColor: PLACEHOLDER_COLOR,
    borderRadius: 2,
  },
  // 실제 메타 줄(무게 · 색상)의 lineHeight(23)와 맞춘다.
  metaBar: {
    height: 20,
    width: '30%',
    backgroundColor: PLACEHOLDER_COLOR,
    borderRadius: 2,
  },
});

export default FeedSkeletonView;
