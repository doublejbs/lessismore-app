import { FC, ReactNode } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import PretendardText from '@/components/PretendardText';
import {
  Liquid,
  LiquidRadius,
  LiquidShadow,
  LiquidMotion,
} from '@/constants/DesignTokens';

type PillVariant = 'primary' | 'accent' | 'secondary' | 'glass';

interface Props {
  label: string;
  /** primary=잉크 · accent=라임 · secondary=흰 아웃라인 · glass=유리 */
  variant?: PillVariant;
  leading?: ReactNode;
  trailing?: ReactNode;
  /** 폭을 꽉 채운다 (하단 고정 바) */
  block?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

const LABEL_COLOR: Record<PillVariant, string> = {
  primary: Liquid.surface,
  accent: Liquid.limeOn,
  secondary: Liquid.ink,
  glass: Liquid.ink,
};

/**
 * Liquid Depth 주 액션 버튼(핸드오프 PillButton). 항상 알약이고 높이 54 고정 —
 * 화면마다 버튼 키가 다르면 주 액션의 무게가 흔들린다.
 */
const LiquidPillButton: FC<Props> = ({
  label,
  variant = 'primary',
  leading,
  trailing,
  block = false,
  onPress,
  style,
}) => {
  const content = (
    <>
      {leading}
      <PretendardText
        weight='semibold'
        style={[styles.label, { color: LABEL_COLOR[variant] }]}
        numberOfLines={1}
      >
        {label}
      </PretendardText>
      {trailing}
    </>
  );

  if (variant === 'glass') {
    return (
      <TouchableOpacity
        style={[styles.pill, styles.glassShell, block && styles.block, style]}
        onPress={onPress}
        activeOpacity={LiquidMotion.pressOpacity}
        accessibilityRole='button'
        accessibilityLabel={label}
      >
        <BlurView
          tint='light'
          intensity={Liquid.glassBlurIntensity}
          style={StyleSheet.absoluteFill}
        />
        <View style={[StyleSheet.absoluteFill, styles.glassOverlay]} />
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.pill, VARIANT_STYLES[variant], block && styles.block, style]}
      onPress={onPress}
      activeOpacity={LiquidMotion.pressOpacity}
      accessibilityRole='button'
      accessibilityLabel={label}
    >
      {content}
    </TouchableOpacity>
  );
};

const VARIANT_STYLES: Record<Exclude<PillVariant, 'glass'>, ViewStyle> = {
  primary: {
    backgroundColor: Liquid.ink,
    boxShadow: LiquidShadow.cta,
  },
  accent: {
    backgroundColor: Liquid.lime,
    boxShadow: LiquidShadow.accent,
  },
  secondary: {
    backgroundColor: Liquid.surface,
    borderWidth: 1,
    borderColor: Liquid.hairlineStrong,
  },
};

const styles = StyleSheet.create({
  pill: {
    height: 54,
    paddingHorizontal: 24,
    borderRadius: LiquidRadius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  block: {
    alignSelf: 'stretch',
  },
  glassShell: {
    borderWidth: 0.5,
    borderColor: Liquid.glassStroke,
    boxShadow: LiquidShadow.glassSm,
  },
  glassOverlay: {
    backgroundColor: Liquid.glassFillStrong,
  },
  label: {
    fontSize: 16,
  },
});

export default LiquidPillButton;
