import { FC, useEffect, useState } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import PretendardText from '@/components/PretendardText';
import {
  Liquid,
  LiquidFont,
  LiquidRadius,
  LiquidShadow,
} from '@/constants/DesignTokens';

type TileTone = 'paper' | 'accent' | 'sunken';
type TileSize = 'md' | 'sm';

interface Props {
  value: string | number;
  label: string;
  /** paper=흰 카드 · accent=강조할 지표 하나 · sunken=카드 **안**에 겹쳐 놓는 타일 */
  tone?: TileTone;
  /** 'sm'은 카드 안 타일(목업 §11 내 정보 프로필 카드) — 숫자 24, 라벨 11.5 */
  size?: TileSize;
  /**
   * 값을 라벨 수준까지 낮춘다 — 0회처럼 셀 것이 없는 지표(목업 §9의 둘째 타일).
   * 흰 면은 라벨보다 한 단계 옅은 `inkMuted`, 라임 면은 라벨과 같은 `limeOnQuiet`가 된다.
   * 면은 그대로 두고 숫자만 물러나므로 타일 줄의 리듬이 깨지지 않는다.
   */
  dim?: boolean;
  /**
   * 값만 라임 계열 잉크로 세운다 — 라임 **면**을 쓸 수 없는 자리(이미 라임 면이 있는 화면,
   * 카드 안 타일)의 강조다(목업 §11 `안 쓴 장비`). `tone='accent'`와 함께 쓰지 않는다.
   */
  highlight?: boolean;
  /**
   * 값이 아직 도착하지 않은 상태. 숫자 자리에 셔머 막대를 두고 라벨은 그대로 둔다 —
   * 타일 자리를 비우거나 0을 먼저 그리면(값이 오는 순간 42로 튄다) 틀린 값을 보여 준다.
   */
  loading?: boolean;
}

// 셔머 반 주기 — 왕복 1.2s(핸드오프 로딩 규칙). 스피너는 쓰지 않는다.
const SHIMMER_HALF_DURATION = 600;

const VALUE_SIZE: Record<TileSize, number> = { md: 34, sm: 24 };

/**
 * Liquid Depth 지표 타일(핸드오프 StatTile). 숫자 하나 + 라벨 하나.
 * 2~3개를 가로로 나란히 둘 때 부모가 flexDirection row + gap을 잡는다.
 */
const LiquidStatTile: FC<Props> = ({
  value,
  label,
  tone = 'paper',
  size = 'md',
  dim = false,
  highlight = false,
  loading = false,
}) => {
  const isAccent = tone === 'accent';
  const isSmall = size === 'sm';
  // ref로 잡으면 렌더 중 `.current`를 읽어 React Compiler가 최적화를 포기한다 — 값을 상태로 든다.
  const [shimmer] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (!loading) {
      return;
    }

    // 재귀 start 콜백 대신 loop — 언마운트 후 다음 주기가 스스로 살아나지 않는다.
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 0.4,
          duration: SHIMMER_HALF_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 1,
          duration: SHIMMER_HALF_DURATION,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [loading, shimmer]);

  const renderValue = () => {
    if (loading) {
      return (
        <Animated.View
          style={[
            styles.shimmerBar,
            { height: VALUE_SIZE[size], opacity: shimmer },
          ]}
        />
      );
    }

    return (
      <PretendardText
        style={[
          styles.value,
          { fontSize: VALUE_SIZE[size], lineHeight: VALUE_SIZE[size] },
          highlight && !isAccent && styles.valueHighlight,
          dim && (isAccent ? styles.valueDimAccent : styles.valueDim),
        ]}
        numberOfLines={1}
      >
        {String(value)}
      </PretendardText>
    );
  };

  return (
    <View
      style={[
        styles.tile,
        isSmall ? styles.tileSmall : styles.tileMedium,
        TONE_STYLES[tone],
      ]}
      /**
       * 셔머 중에는 숫자 자리에 읽을 텍스트가 아예 없다 — 타일을 한 요소로 묶어
       * `{라벨} 불러오는 중`으로 읽히게 하고 `busy`를 함께 준다. 값이 도착하면 묶음을 풀어
       * 숫자·라벨이 그대로 읽히게 되돌린다.
       */
      accessible={loading}
      accessibilityLabel={loading ? `${label} 불러오는 중` : undefined}
      accessibilityState={{ busy: loading }}
    >
      {renderValue()}
      <PretendardText
        weight='semibold'
        style={[
          styles.label,
          isSmall && styles.labelSmall,
          isAccent && styles.labelAccent,
        ]}
        numberOfLines={1}
      >
        {label}
      </PretendardText>
    </View>
  );
};

const TONE_STYLES: Record<TileTone, ViewStyle> = {
  paper: {
    backgroundColor: Liquid.surface,
    boxShadow: LiquidShadow.tile,
  },
  accent: {
    backgroundColor: Liquid.lime,
    boxShadow: LiquidShadow.accent,
  },
  // 카드 안 타일은 그림자를 깔지 않는다 — 이미 카드가 지면에서 떠 있다.
  sunken: {
    backgroundColor: Liquid.surfaceSunken,
  },
};

const styles = StyleSheet.create({
  tile: {
    flex: 1,
  },
  tileMedium: {
    borderRadius: LiquidRadius.tile,
    padding: 16,
    gap: 6,
  },
  tileSmall: {
    borderRadius: LiquidRadius.tileSm,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 3,
  },
  value: {
    fontFamily: LiquidFont.condensed,
    color: Liquid.ink,
  },
  // 흰 면 위 낮춘 숫자 — 라벨(inkSecondary)보다 한 단계 더 물러난다.
  valueDim: {
    color: Liquid.inkMuted,
  },
  // 라임 면 위에서는 잉크 계열로 내리면 대비가 오히려 세진다 — 라벨과 같은 색으로 합친다.
  valueDimAccent: {
    color: Liquid.limeOnQuiet,
  },
  valueHighlight: {
    color: Liquid.limeInk,
  },
  /**
   * 잉크 스케일의 가장 옅은 값. 가라앉은 면(`surfaceSunken`)과 같은 값을 쓰면 타일 안에서
   * 막대 형태가 사라진다(창고 스켈레톤과 같은 처리).
   */
  shimmerBar: {
    alignSelf: 'flex-start',
    width: '55%',
    borderRadius: 4,
    backgroundColor: Liquid.inkFaint,
  },
  /**
   * 라벨은 `inkSecondary` + 600이다 — 목업의 `inkMuted`/500은 12.5px에서 흰 면 대비 AA(4.5:1)에
   * 못 미쳐 한 단계 올렸다(HIG 대비). 값(`dim`일 때 `inkMuted`)이 라벨보다 옅어지는 순서는
   * 그대로 유지된다.
   */
  label: {
    fontSize: 12.5,
    color: Liquid.inkSecondary,
  },
  labelSmall: {
    fontSize: 11.5,
  },
  labelAccent: {
    color: Liquid.limeOnQuiet,
  },
});

export default LiquidStatTile;
