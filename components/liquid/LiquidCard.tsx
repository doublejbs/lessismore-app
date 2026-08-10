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
  style?: StyleProp<ViewStyle>;
}

/**
 * Liquid Depth 콘텐츠 면(핸드오프 Card). 이 시스템에서 구획은 그림자가 아니라 면이 맡는다.
 *
 * glass 톤만 BlurView를 깐다 — RN에 backdrop-filter가 없어 블러 + `glassFill` 오버레이 +
 * 0.5px `glassStroke` 보더로 유리를 근사한다(핸드오프 웹→RN 변환 규칙).
 */
const LiquidCard: FC<Props> = ({
  children,
  tone = 'paper',
  radius = 'card',
  padding = LiquidLayout.cardPad,
  style,
}) => {
  const borderRadius = LiquidRadius[radius];

  if (tone === 'glass') {
    return (
      <View style={[styles.glassShell, { borderRadius }, style]}>
        <BlurView
          tint='light'
          intensity={Liquid.glassBlurIntensity}
          style={StyleSheet.absoluteFill}
        />
        {/* 블러 위 유리 채움 — BlurView 배경색은 블러를 가리므로 별도 레이어로 얹는다. */}
        <View style={[StyleSheet.absoluteFill, styles.glassOverlay]} />
        <View style={{ padding }}>{children}</View>
      </View>
    );
  }

  return (
    <View style={[styles.base, TONE_STYLES[tone], { borderRadius, padding }, style]}>
      {children}
    </View>
  );
};

const TONE_STYLES: Record<Exclude<CardTone, 'glass'>, ViewStyle> = {
  paper: {
    backgroundColor: Liquid.surface,
    boxShadow: LiquidShadow.card,
  },
  quiet: {
    backgroundColor: Liquid.surfaceQuiet,
    borderWidth: 0.5,
    borderColor: Liquid.hairline,
  },
  accent: {
    backgroundColor: Liquid.lime,
    boxShadow: LiquidShadow.accent,
  },
  ink: {
    backgroundColor: Liquid.ink,
    boxShadow: LiquidShadow.cta,
  },
};

const styles = StyleSheet.create({
  base: {},
  glassShell: {
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: Liquid.glassStroke,
    boxShadow: LiquidShadow.glass,
  },
  glassOverlay: {
    backgroundColor: 'rgba(255,255,255,0.82)',
  },
});

export default LiquidCard;
