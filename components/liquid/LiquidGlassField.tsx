import { FC, ReactNode } from 'react';
import {
  View,
  StyleSheet,
  StyleProp,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import {
  Liquid,
  LiquidMotion,
  LiquidRadius,
  LiquidShadow,
} from '@/constants/DesignTokens';

/**
 * 유리 필드 높이 — 탐색·검색 결과 화면의 검색 필드와 같은 값이다(목업 §2·§3).
 * 리뷰·답글 입력 바도 이 값을 쓴다 — 같은 자리(화면 하단·상단의 한 줄 입력)에 놓이는
 * 면이라 화면마다 키가 다르면 같은 것이 다르게 읽힌다.
 */
export const LIQUID_FIELD_HEIGHT = 48;

interface Props {
  children: ReactNode;
  /** 값이 들어온 상태 — 채움을 한 단계 진하게 덮어 입력 상태를 드러낸다 */
  filled?: boolean;
  /**
   * 여러 줄로 자라는 필드. 완전한 알약을 유지할 수 없으므로 모서리를 카드값(20)으로 낮추고
   * (각진 면은 이 시스템에 없다) 최대 높이를 건다.
   */
  grownMaxHeight?: number;
  /** 넘기면 필드 자체가 버튼이 된다 — 실제 입력은 다른 화면(시트)이 받는 자리 */
  onPress?: () => void;
  /** 버튼으로 쓸 때 필수 — 필드에 보이는 라벨이 플레이스홀더뿐이다 */
  accessibilityLabel?: string;
  /** 행 안에 놓을 때 `flex: 1`을 넘긴다. 기본은 부모 폭을 그대로 채운다 */
  style?: StyleProp<ViewStyle>;
}

/**
 * Liquid Depth 유리 필드 셸(목업 §2·§3).
 *
 * 지면 위에 살짝 떠 있는 유리 한 줄을 그린다 — RN에 `backdrop-filter`가 없어
 * BlurView + 유리 채움 + 0.5px `glassStroke` 보더로 근사한다.
 * 안에 무엇이 들어가는지는 호출부가 정한다: 검색 인풋(`LiquidSearchField`),
 * 시트를 여는 플레이스홀더 줄(리뷰 쓰기 진입), 여러 줄 입력 + 저장(답글).
 *
 * **그림자와 클리핑을 다른 뷰가 든다** — 같은 뷰에 `overflow: 'hidden'`과 `boxShadow`를
 * 함께 주면 그림자가 자기 경계에서 잘린다(`LiquidGlassCapsule`과 같은 처리).
 */
const LiquidGlassField: FC<Props> = ({
  children,
  filled = false,
  grownMaxHeight,
  onPress,
  accessibilityLabel,
  style,
}) => {
  const surface = (
    <>
      <BlurView
        tint='light'
        intensity={Liquid.glassBlurIntensity}
        style={StyleSheet.absoluteFill}
      />
      {/* 블러 위 유리 채움 — BlurView 배경색은 블러를 가리므로 별도 레이어로 얹는다. */}
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.fill,
          filled && styles.fillActive,
        ]}
      />
      {children}
    </>
  );

  const fieldStyle = [
    styles.field,
    grownMaxHeight !== undefined && {
      maxHeight: grownMaxHeight,
      borderRadius: LiquidRadius.tile,
    },
  ];

  return (
    <View style={[styles.shadow, style]}>
      {onPress ? (
        <TouchableOpacity
          style={fieldStyle}
          onPress={onPress}
          activeOpacity={LiquidMotion.pressOpacity}
          accessibilityRole='button'
          {...(accessibilityLabel ? { accessibilityLabel } : {})}
        >
          {surface}
        </TouchableOpacity>
      ) : (
        <View style={fieldStyle}>{surface}</View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  shadow: {
    borderRadius: LIQUID_FIELD_HEIGHT / 2,
    boxShadow: LiquidShadow.field,
  },
  // 고정 높이 대신 minHeight — Dynamic Type으로 글자가 커져도 입력줄이 잘리지 않는다.
  field: {
    minHeight: LIQUID_FIELD_HEIGHT,
    borderRadius: LIQUID_FIELD_HEIGHT / 2,
    borderWidth: 0.5,
    borderColor: Liquid.glassStroke,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  fill: {
    backgroundColor: Liquid.glassFillField,
  },
  // 채워진 필드 — 목업의 `rgba(255,255,255,.85)`가 곧 glassFillStrong이다.
  fillActive: {
    backgroundColor: Liquid.glassFillStrong,
  },
});

export default LiquidGlassField;
