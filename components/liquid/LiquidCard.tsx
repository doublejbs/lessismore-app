import { FC, ReactNode } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import {
  Liquid,
  LiquidRadius,
  LiquidShadow,
  LiquidLayout,
} from '@/constants/DesignTokens';

type CardTone = 'paper' | 'quiet' | 'glass' | 'accent' | 'ink';
type CardRadius = 'tile' | 'card' | 'hero' | 'sheet';

interface Props {
  children?: ReactNode;
  /** paper=흰 카드 · quiet=지난 항목 · glass=떠 있는 면 · accent=라임 · ink=잉크 */
  tone?: CardTone;
  radius?: CardRadius;
  padding?: number;
  /**
   * 자식을 카드 모서리로 깎는다 — 목록 행을 담아 첫·마지막 행이 카드 밖으로 새지 않게
   * 하거나(창고·리뷰 목록), 스와이프 액션 면을 카드 안에서 끝낼 때 켠다.
   *
   * **그림자와 클리핑을 다른 뷰가 든다** — 켜면 껍데기(그림자)와 안쪽(면 + 클리핑)을 나눠
   * 렌더한다. RN 0.86 Fabric은 뷰의 `boxShadow`를 자기 `overflow: 'hidden'`으로 자르지
   * 않는 것으로 보이지만, 웹과 옛 아키텍처에서는 잘렸고 두 겹으로 나눠 두면 어느 쪽에서도
   * 결과가 같다. 호출부마다 두 겹을 손으로 쌓지 않게 프리미티브가 든다.
   */
  clip?: boolean;
  /**
   * 카드의 자리(여백·폭)를 정한다. `clip`을 켜면 이 스타일은 **껍데기**에 붙으므로
   * 면 색(`backgroundColor`)을 여기로 넘기지 않는다 — 클리핑된 면 뒤에 깔려 보이지 않는다.
   */
  style?: StyleProp<ViewStyle>;
}

/**
 * Liquid Depth 콘텐츠 면(핸드오프 Card). 이 시스템에서 구획은 그림자가 아니라 면이 맡는다.
 *
 * glass 톤만 BlurView를 깐다 — RN에 backdrop-filter가 없어 블러 + `glassFillCard` 오버레이 +
 * 0.5px `glassStroke` 보더로 유리를 근사한다(핸드오프 웹→RN 변환 규칙).
 */
const LiquidCard: FC<Props> = ({
  children,
  tone = 'paper',
  radius = 'card',
  padding = LiquidLayout.cardPad,
  clip = false,
  style,
}) => {
  const borderRadius = LiquidRadius[radius];

  if (tone === 'glass') {
    return (
      // 껍데기가 그림자를, 안쪽이 유리 면과 클리핑을 든다(위 `clip` 주석과 같은 이유이며
      // `LiquidBottomSheet`·`LiquidGlassCapsule`도 같은 두 겹이다).
      <View style={[styles.glassShell, { borderRadius }, style]}>
        <View style={[styles.glassClip, { borderRadius }]}>
          <BlurView
            tint='light'
            intensity={Liquid.glassBlurIntensity}
            style={StyleSheet.absoluteFill}
          />
          {/* 블러 위 유리 채움 — BlurView 배경색은 블러를 가리므로 별도 레이어로 얹는다. */}
          <View style={[StyleSheet.absoluteFill, styles.glassFill]} />
          <View style={{ padding }}>{children}</View>
        </View>
      </View>
    );
  }

  if (clip) {
    return (
      // 껍데기가 그림자를, 안쪽이 면과 클리핑을 든다(위 prop 주석 참고).
      <View style={[styles.base, SHADOW_STYLES[tone], { borderRadius }, style]}>
        <View
          style={[styles.clipped, FILL_STYLES[tone], { borderRadius, padding }]}
        >
          {children}
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.base, TONE_STYLES[tone], { borderRadius, padding }, style]}
    >
      {children}
    </View>
  );
};

/**
 * `clip`을 켤 때 톤 스타일을 면(안쪽)과 그림자(껍데기)로 갈라 쓴다 — 두 값이 한 뷰에
 * 함께 있으면 그림자가 클리핑 경계에서 잘린다. 클리핑하지 않는 기본 경로는 아래에서
 * 두 표를 합쳐 쓴다 — 톤 하나를 고칠 때 두 곳을 손대지 않게 단일 소스로 둔다.
 */
const FILL_STYLES: Record<Exclude<CardTone, 'glass'>, ViewStyle> = {
  paper: { backgroundColor: Liquid.surface },
  quiet: {
    backgroundColor: Liquid.surfaceQuiet,
    borderWidth: 0.5,
    borderColor: Liquid.hairline,
  },
  accent: { backgroundColor: Liquid.lime },
  ink: { backgroundColor: Liquid.ink },
};

const SHADOW_STYLES: Record<Exclude<CardTone, 'glass'>, ViewStyle> = {
  paper: { boxShadow: LiquidShadow.card },
  // 지난 항목 카드는 그림자 없이 테두리로만 서 있다 — 껍데기가 들 그림자가 없다.
  quiet: {},
  accent: { boxShadow: LiquidShadow.accent },
  ink: { boxShadow: LiquidShadow.cta },
};

// 클리핑하지 않는 카드 — 면과 그림자를 한 뷰에 함께 둔다(위 두 표에서 파생).
const TONE_STYLES: Record<Exclude<CardTone, 'glass'>, ViewStyle> = {
  paper: { ...FILL_STYLES.paper, ...SHADOW_STYLES.paper },
  quiet: { ...FILL_STYLES.quiet, ...SHADOW_STYLES.quiet },
  accent: { ...FILL_STYLES.accent, ...SHADOW_STYLES.accent },
  ink: { ...FILL_STYLES.ink, ...SHADOW_STYLES.ink },
};

const styles = StyleSheet.create({
  base: {},
  clipped: {
    overflow: 'hidden',
  },
  glassShell: {
    boxShadow: LiquidShadow.glass,
  },
  glassClip: {
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: Liquid.glassStroke,
  },
  glassFill: {
    backgroundColor: Liquid.glassFillCard,
  },
});

export default LiquidCard;
