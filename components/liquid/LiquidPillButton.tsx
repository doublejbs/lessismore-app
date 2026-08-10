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
        style={[
          styles.pill,
          styles.glassShell,
          styles.clipped,
          block && styles.block,
          style,
        ]}
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
  },
  /**
   * 유리 변형만 클리핑한다 — BlurView·채움 레이어를 알약 모양으로 깎으려면 필요하다.
   * **잉크·라임 변형에는 걸지 않는다**: 같은 뷰에 `overflow: 'hidden'`과 `boxShadow`를
   * 함께 주면 그림자가 자기 경계에서 잘려 CTA가 지면에서 떠 보이지 않는다.
   */
  clipped: {
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
