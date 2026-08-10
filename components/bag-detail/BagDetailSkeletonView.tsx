import { FC, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Platform,
  DimensionValue,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LiquidBackdrop from '@/components/liquid/LiquidBackdrop';
import {
  Liquid,
  LiquidLayout,
  LiquidRadius,
  LiquidShadow,
} from '@/constants/DesignTokens';

const IS_IOS = Platform.OS === 'ios';

// 셔머 한 주기 1.2초(핸드오프 Interactions: 스피너 대신 셔머).
const PULSE_DURATION = 600;
const PULSE_MIN = 0.4;

interface BoxProps {
  pulse: Animated.Value;
  width?: DimensionValue;
  height: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * 셰이딩은 반투명 잉크를 쓴다 — 지면(canvas)과 흰 카드 **양쪽**에 얹히므로 불투명
 * `surfaceSunken`으로 두면 지면 위에서 거의 보이지 않는다.
 */
const SkeletonBox: FC<BoxProps> = ({
  pulse,
  width,
  height,
  radius = 6,
  style,
}) => {
  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: Liquid.hairlineStrong,
          opacity: pulse,
        },
        style,
      ]}
    />
  );
};

/**
 * BD-1 상세 로딩 골격 (Liquid Depth).
 *
 * 들어올 화면과 **같은 골격**을 그린다 — 지형 지면, 타이틀 블록, 히어로 카드, 2×2 타일,
 * 섹션 머리, 장비 카드. 라인박스 높이까지 실제 값과 맞춰 로딩이 풀릴 때 콘텐츠가 튀지 않게 한다.
 */
const BagDetailSkeletonView: FC = () => {
  const insets = useSafeAreaInsets();
  const [pulse] = useState(() => new Animated.Value(PULSE_MIN));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: PULSE_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: PULSE_MIN,
          duration: PULSE_DURATION,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [pulse]);

  const renderGearRow = (index: number) => (
    <View key={index} style={styles.gearRow}>
      <View style={styles.gearRowIdentity}>
        <SkeletonBox pulse={pulse} width='60%' height={20} />
        <SkeletonBox pulse={pulse} width='40%' height={17} />
      </View>
      <SkeletonBox pulse={pulse} width={44} height={20} />
    </View>
  );

  const renderCategory = (index: number) => (
    <View key={index}>
      <SkeletonBox
        pulse={pulse}
        width={64}
        height={16}
        style={styles.categoryLabel}
      />
      <View style={styles.gearCard}>
        {Array.from({ length: 3 }, (_, rowIndex) => renderGearRow(rowIndex))}
      </View>
    </View>
  );

  const renderTile = (index: number) => (
    <View key={index} style={styles.tile}>
      <SkeletonBox pulse={pulse} width={21} height={21} radius={4} />
      <View style={styles.tileText}>
        <SkeletonBox pulse={pulse} width='70%' height={20} />
        <SkeletonBox pulse={pulse} width='45%' height={17} />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <LiquidBackdrop screen='bagDetail' glowPosition='leftMid' />

      {/* iOS는 네이티브 투명 헤더가 이미 상단을 그리므로 자리만 비운다.
          Android/Web은 유리 크롬(원 38 + 캡슐)의 자리를 골격으로 표시한다. */}
      {IS_IOS ? (
        <View style={{ height: insets.top + LiquidLayout.navBar }} />
      ) : (
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <SkeletonBox pulse={pulse} width={38} height={38} radius={19} />
          <SkeletonBox pulse={pulse} width={112} height={38} radius={19} />
        </View>
      )}

      <View style={styles.titleBlock}>
        <SkeletonBox
          pulse={pulse}
          width={104}
          height={26}
          radius={LiquidRadius.pill}
        />
        <SkeletonBox
          pulse={pulse}
          width='72%'
          height={38}
          style={styles.titleName}
        />
        <SkeletonBox
          pulse={pulse}
          width='48%'
          height={18}
          style={styles.titleDate}
        />
      </View>

      {/* 무게 히어로 카드 — 큰 숫자 54 + 스택 바 10 + 범례 한 줄. */}
      <View style={styles.hero}>
        <SkeletonBox pulse={pulse} width={132} height={54} />
        <SkeletonBox
          pulse={pulse}
          width='100%'
          height={10}
          radius={5}
          style={styles.heroBar}
        />
        <SkeletonBox
          pulse={pulse}
          width='64%'
          height={17}
          style={styles.heroLegend}
        />
      </View>

      <View style={styles.tileGrid}>
        {Array.from({ length: 4 }, (_, index) => renderTile(index))}
      </View>

      <View style={styles.gearHeaderTitleRow}>
        <SkeletonBox pulse={pulse} width={92} height={26} />
        <SkeletonBox pulse={pulse} width={34} height={18} />
      </View>
      <View style={styles.chipRow}>
        {Array.from({ length: 4 }, (_, index) => (
          <SkeletonBox
            key={index}
            pulse={pulse}
            width={68}
            height={34}
            radius={17}
          />
        ))}
      </View>

      <View style={styles.gearList}>
        {Array.from({ length: 2 }, (_, index) => renderCategory(index))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // 지면은 LiquidBackdrop이 깐다.
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  titleBlock: {
    paddingTop: 8,
    paddingHorizontal: LiquidLayout.screenH,
  },
  titleName: {
    marginTop: 10,
  },
  titleDate: {
    marginTop: 2,
  },
  hero: {
    marginTop: 18,
    marginHorizontal: LiquidLayout.screenH,
    padding: LiquidLayout.cardPadLg,
    borderRadius: LiquidRadius.hero,
    backgroundColor: Liquid.surface,
    boxShadow: LiquidShadow.card,
  },
  heroBar: {
    marginTop: 16,
  },
  heroLegend: {
    marginTop: 14,
  },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    marginTop: 12,
    paddingHorizontal: LiquidLayout.screenH,
  },
  tile: {
    width: '48%',
    minHeight: 96,
    borderRadius: LiquidRadius.card,
    backgroundColor: Liquid.surface,
    boxShadow: LiquidShadow.tile,
    padding: 16,
    justifyContent: 'space-between',
    gap: 12,
  },
  tileText: {
    gap: 2,
  },
  gearHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: LiquidLayout.section,
    paddingBottom: 12,
    paddingHorizontal: LiquidLayout.screenH,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: LiquidLayout.screenH,
    paddingBottom: 12,
  },
  gearList: {
    gap: LiquidLayout.section,
    paddingHorizontal: LiquidLayout.screenH,
  },
  categoryLabel: {
    marginBottom: 10,
  },
  gearCard: {
    borderRadius: LiquidRadius.card,
    backgroundColor: Liquid.surface,
    boxShadow: LiquidShadow.card,
  },
  // 실제 행(LiquidMetricRow: paddingVertical 15 / paddingHorizontal 16 / gap 12)과 같은 리듬.
  gearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  gearRowIdentity: {
    flex: 1,
    gap: 2,
  },
});

export default BagDetailSkeletonView;
