import { FC, useEffect, useState } from 'react';
import { View, StyleSheet, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Liquid,
  LiquidLayout,
  LiquidRadius,
  LiquidShadow,
} from '@/constants/DesignTokens';

// 셔머 반 주기 — 왕복 1.2s(핸드오프 로딩 규칙). 스피너는 쓰지 않는다.
const SHIMMER_HALF_DURATION = 600;
// 잉크 스케일의 가장 옅은 값. 가라앉은 면(surfaceSunken)은 흰 카드와 값이 붙어 형태가 사라진다.
const PLACEHOLDER_COLOR = Liquid.inkFaint;
const BAR_RADIUS = 4;
// iOS는 투명 네이티브 헤더가 상단을 덮으므로 그 높이를 직접 비운다(본 화면과 같은 처리).
const IS_IOS = Platform.OS === 'ios';
/**
 * 정체 블록 위 여백. 본 화면에서는 **콘텐츠 첫 블록**(`WarehouseDetailInformationView`의
 * `paddingTop: 14`)이 들고, 그 값은 iOS 헤더 인셋 **위에** 더해진다(스크롤 컨테이너가
 * `insets.top + navBar`를 비우고 그 안에서 다시 14). 스켈레톤도 같은 식으로 더해야 로드 직후
 * 정체 블록이 14pt 튀지 않는다 — 인셋으로 덮어 쓰면 스켈레톤만 14 위에 붙는다.
 */
const CONTENT_PAD_TOP = 14;

/**
 * GD-1 장비 상세 스켈레톤 (Liquid Depth).
 *
 * 도착할 화면(정체 블록 → 지표 타일 → 스펙 카드)과 **같은 골격**이라야 로드 후 자리가
 * 튀지 않는다 — 좌우 정렬선·섹션 여백·카드 모서리를 본 화면과 같은 토큰으로 둔다.
 * 하단 CTA는 그리지 않는다: 보유 여부를 아직 몰라 버튼이 있을지부터 정해지지 않았다.
 */
const useShimmer = (): Animated.Value => {
  // ref로 잡으면 렌더 중 `.current`를 읽어 React Compiler가 최적화를 포기한다 — 값을 상태로 든다.
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    // 재귀 start 콜백 대신 loop — 언마운트 후에도 다음 주기가 스스로 살아나는 일이 없고,
    // cleanup에서 한 번 멈추면 끝난다(WarehouseSkeletonView와 같은 패턴).
    const animation = Animated.loop(
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
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [opacity]);

  return opacity;
};

const WarehouseDetailSkeletonView: FC = () => {
  const opacity = useShimmer();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        IS_IOS
          ? {
              paddingTop: insets.top + LiquidLayout.navBar + CONTENT_PAD_TOP,
            }
          : null,
      ]}
    >
      {/* 정체 블록 — 브랜드(13) → 이름(28) → 태그 칩 줄 + 우측 무게(42) */}
      <View style={styles.identity}>
        <Animated.View style={[styles.brandBar, { opacity }]} />
        <Animated.View style={[styles.nameBar, { opacity }]} />
        <View style={styles.metaRow}>
          <View style={styles.tags}>
            <Animated.View style={[styles.tagChip, { opacity }]} />
            <Animated.View style={[styles.tagChip, { opacity }]} />
          </View>
          <Animated.View style={[styles.weightBar, { opacity }]} />
        </View>
      </View>

      {/* 섹션 하나 — 라벨 + 카드 */}
      <View style={styles.section}>
        <Animated.View style={[styles.sectionLabel, { opacity }]} />
        <View style={styles.cardShell}>
          <View style={styles.cardClip}>
            {[0, 1, 2].map(index => (
              <View key={index} style={styles.specRow}>
                <Animated.View style={[styles.specLabel, { opacity }]} />
                <Animated.View style={[styles.specValue, { opacity }]} />
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // 지면은 래퍼의 LiquidBackdrop이 깐다.
    backgroundColor: 'transparent',
    // Android·Web은 유리 크롬이 흐름에 앉아 있어 이 값만으로 본 화면과 같은 여백이 된다.
    paddingTop: CONTENT_PAD_TOP,
  },
  identity: {
    paddingHorizontal: LiquidLayout.screenH,
    gap: 8,
  },
  brandBar: {
    height: 14,
    width: 96,
    backgroundColor: PLACEHOLDER_COLOR,
    borderRadius: BAR_RADIUS,
  },
  nameBar: {
    height: 30,
    width: '72%',
    backgroundColor: PLACEHOLDER_COLOR,
    borderRadius: BAR_RADIUS,
  },
  metaRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  tags: {
    flexDirection: 'row',
    gap: 6,
  },
  tagChip: {
    height: 28,
    width: 72,
    backgroundColor: PLACEHOLDER_COLOR,
    borderRadius: 14,
  },
  weightBar: {
    height: 34,
    width: 88,
    backgroundColor: PLACEHOLDER_COLOR,
    borderRadius: BAR_RADIUS,
  },
  section: {
    marginTop: 24,
    marginHorizontal: LiquidLayout.screenH,
  },
  sectionLabel: {
    height: 11,
    width: 64,
    marginBottom: 10,
    backgroundColor: PLACEHOLDER_COLOR,
    borderRadius: BAR_RADIUS,
  },
  // 그림자는 껍데기가 든다 — 안쪽에서 모서리를 깎으므로 같은 뷰에 그림자를 걸면 잘린다.
  cardShell: {
    borderRadius: LiquidRadius.card,
    boxShadow: LiquidShadow.card,
  },
  cardClip: {
    borderRadius: LiquidRadius.card,
    overflow: 'hidden',
    backgroundColor: Liquid.surface,
    paddingHorizontal: LiquidLayout.cardPad,
    paddingVertical: 4,
  },
  // 실제 스펙 행(paddingVertical 13 · gap 12 · 라벨 96)과 같은 리듬.
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
  },
  specLabel: {
    height: 14,
    width: 96,
    backgroundColor: PLACEHOLDER_COLOR,
    borderRadius: BAR_RADIUS,
  },
  specValue: {
    height: 14,
    flex: 1,
    backgroundColor: PLACEHOLDER_COLOR,
    borderRadius: BAR_RADIUS,
  },
});

export default WarehouseDetailSkeletonView;
