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
  LiquidSemantic,
  LiquidShadow,
  LiquidMotion,
} from '@/constants/DesignTokens';

type PillVariant =
  'primary' | 'accent' | 'secondary' | 'quiet' | 'glass' | 'danger';

/**
 * 좌우 여백 기본값. 알약의 **글자 폭**을 정하는 값이라 `styles.pill`에 박아 두지 않고
 * prop 기본값 한 곳에 둔다(호출부가 좁혀도 값의 출처가 하나다).
 */
const PILL_PAD_H = 24;

interface Props {
  label: string;
  /**
   * primary=잉크 · accent=라임 · secondary=흰 아웃라인 · quiet=가라앉은 면 ·
   * glass=유리 · danger=되돌릴 수 없는 액션(회원 탈퇴). `danger`는 의미색이라 액센트
   * 체계 밖이며, 앱에서 이 변형을 쓰는 자리는 탈퇴 확정 하나뿐이다 — 지우기·해제처럼
   * 되돌릴 수 있는 액션에는 쓰지 않는다.
   */
  variant?: PillVariant;
  /**
   * 좌우 여백. 기본 24이고, **폭이 정해진 자리에 라벨이 길 때만** 좁힌다 —
   * 알럿 카드의 두 알약(`처음부터 다시`)이 360dp에서 기본값이면 말줄임된다.
   */
  paddingHorizontal?: number;
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
  quiet: Liquid.ink,
  glass: Liquid.ink,
  danger: Liquid.surface,
};

/**
 * Liquid Depth 주 액션 버튼(핸드오프 PillButton). 항상 알약이고 높이는
 * `LiquidLayout.pillHeight` 고정 — 화면마다 버튼 키가 다르면 주 액션의 무게가 흔들린다.
 */
const LiquidPillButton: FC<Props> = ({
  label,
  variant = 'primary',
  paddingHorizontal = PILL_PAD_H,
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
      // 껍데기가 그림자를, 안쪽이 유리 면과 클리핑을 든다 — 다른 유리 프리미티브
      // (`LiquidGlassCapsule`·`LiquidBottomSheet`·`LiquidCard`)와 같은 두 겹이다.
      <TouchableOpacity
        style={[
          styles.glassShell,
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
        <View style={[styles.pill, { paddingHorizontal }, styles.glassClip]}>
          <BlurView
            tint='light'
            intensity={Liquid.glassBlurIntensity}
            style={StyleSheet.absoluteFill}
          />
          <View style={[StyleSheet.absoluteFill, styles.glassFill]} />
          {content}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.pill,
        { paddingHorizontal },
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
  /**
   * **흰 카드 위**의 보조 액션. `secondary`(흰 면 + 헤어라인)는 지면·유리 위에서는 면이
   * 갈리지만 흰 카드 위에서는 테두리 하나만 남아(1.25:1) 버튼으로 읽히지 않는다 —
   * 면을 한 단계 가라앉혀(`surfaceSunken`) 카드에서 떼어 낸다. 카드 안에 놓이는 타일과
   * 같은 값이라 새 색이 늘지 않는다. 그림자는 없다(보조 액션은 뜨지 않는다).
   */
  quiet: {
    backgroundColor: Liquid.surfaceSunken,
  },
  // 잉크 CTA와 같은 무게로 떠 있어야 한다 — 그림자는 잉크 계열 그대로 쓴다.
  danger: {
    backgroundColor: LiquidSemantic.danger,
    boxShadow: LiquidShadow.cta,
  },
};

const styles = StyleSheet.create({
  pill: {
    height: LiquidLayout.pillHeight,
    borderRadius: LiquidRadius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  block: {
    alignSelf: 'stretch',
  },
  disabled: {
    opacity: LiquidMotion.disabledOpacity,
  },
  // 유리 변형의 껍데기 — 그림자만 든다. 잉크·라임 변형은 클리핑할 레이어가 없어 이 겹이 없다.
  glassShell: {
    borderRadius: LiquidRadius.pill,
    alignSelf: 'flex-start',
    boxShadow: LiquidShadow.glassSm,
  },
  /**
   * BlurView·채움 레이어를 알약 모양으로 깎는다. 클리핑과 그림자를 한 뷰에 겹쳐 두지 않는
   * 이유는 `LiquidCard`의 `clip` 주석과 같다 — RN 0.86 Fabric은 자기 그림자를 자르지 않는
   * 것으로 보이지만, 웹과 옛 아키텍처에서는 잘렸고 나눠 두면 어느 쪽에서도 결과가 같다.
   */
  glassClip: {
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: Liquid.glassStroke,
    // 껍데기가 자리를 정하므로 안쪽은 그 폭을 그대로 채운다 — `pill`의 `flex-start`를 덮는다
    // (`block`일 때 껍데기만 늘어나고 유리 면은 글자 폭에 머무는 것을 막는다).
    alignSelf: 'stretch',
  },
  glassFill: {
    backgroundColor: Liquid.glassFillStrong,
  },
  label: {
    fontSize: 16,
  },
});

export default LiquidPillButton;
