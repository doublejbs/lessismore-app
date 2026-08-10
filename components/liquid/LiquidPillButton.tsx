import { FC, ReactNode } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  GestureResponderEvent,
} from 'react-native';
import { BlurView } from 'expo-blur';
import PretendardText from '@/components/PretendardText';
import {
  Liquid,
  LiquidLayout,
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
  /**
   * 누를 수 없는 상태 — 요청이 오가는 동안 재탭을 막는다. 면·모서리는 그대로 두고
   * 전체 투명도만 낮춘다(색을 바꾸면 다른 버튼처럼 읽힌다).
   */
  disabled?: boolean;
  /**
   * 요청이 오가는 중임을 스크린리더에 알린다. 진행 표시(`leading` 스피너)는 시각 정보뿐이라
   * 이 값이 없으면 VoiceOver에는 그냥 "비활성 버튼"으로만 읽힌다.
   */
  busy?: boolean;
  /** TouchableOpacity와 같은 시그니처 — 이벤트를 쓰는 호출부(하단 CTA)가 있다 */
  onPress?: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
}

const LABEL_COLOR: Record<PillVariant, string> = {
  primary: Liquid.surface,
  accent: Liquid.limeOn,
  secondary: Liquid.ink,
  glass: Liquid.ink,
};

/**
 * Liquid Depth 주 액션 버튼(핸드오프 PillButton). 항상 알약이고 높이는
 * `LiquidLayout.pillHeight` 고정 — 화면마다 버튼 키가 다르면 주 액션의 무게가 흔들린다.
 */
const LiquidPillButton: FC<Props> = ({
  label,
  variant = 'primary',
  leading,
  trailing,
  block = false,
  disabled = false,
  busy = false,
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
          disabled && styles.disabled,
          style,
        ]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={LiquidMotion.pressOpacity}
        accessibilityRole='button'
        accessibilityLabel={label}
        accessibilityState={{ disabled, busy }}
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
      style={[
        styles.pill,
        VARIANT_STYLES[variant],
        block && styles.block,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={LiquidMotion.pressOpacity}
      accessibilityRole='button'
      accessibilityLabel={label}
      accessibilityState={{ disabled, busy }}
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
    height: LiquidLayout.pillHeight,
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
  disabled: {
    opacity: LiquidMotion.disabledOpacity,
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
