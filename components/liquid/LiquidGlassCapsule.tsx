import { FC, ReactNode } from 'react';
import {
  View,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Liquid, LiquidMotion, LiquidShadow } from '@/constants/DesignTokens';

/**
 * 유리 크롬 지오메트리(목업 §6·§7). 원·캡슐 높이는 화면마다 다르지 않다 —
 * 배낭 상세·패킹 모드·창고·장비 상세 헤더가 모두 이 하나를 참조한다.
 */
export const LIQUID_CHROME_HEIGHT = 38;

// 시각 높이 38을 HIG 최소 터치 타깃 44pt로 채우는 여유.
const TOUCH_SLOP = { top: 3, bottom: 3, left: 3, right: 3 };

interface Props {
  children?: ReactNode;
  /** 캡슐 내부 좌우 여백 — 아이콘 캡슐 5(칸 34 기준), 텍스트 알약 14 */
  paddingHorizontal?: number;
  /** 캡슐 안 칸 사이 간격 */
  gap?: number;
  /** 폭 고정(원형 크롬). 기본은 내용 폭이다 */
  width?: number;
  /** 넘기면 캡슐 자체가 버튼이 된다 — 44pt 터치 여유·`button` 롤이 함께 붙는다 */
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Liquid Depth 유리 크롬 셸(목업 §6·§7).
 *
 * 지면 위에 뜬 반투명 알약 하나를 그린다 — BlurView + `glassFill` 오버레이 + 0.5px
 * `glassStroke` 보더로 유리를 근사한다(RN에 backdrop-filter가 없다).
 * 아이콘 여러 개를 담는 액션 캡슐, 글자 하나를 담는 텍스트 알약이 같은 문법을 쓴다.
 */
const LiquidGlassCapsule: FC<Props> = ({
  children,
  paddingHorizontal = 0,
  gap,
  width,
  onPress,
  accessibilityLabel,
  style,
}) => {
  const surface = (
    <View
      style={[
        styles.surface,
        { paddingHorizontal },
        width !== undefined ? { width } : null,
        gap !== undefined ? { gap } : null,
      ]}
    >
      <BlurView
        tint='light'
        intensity={Liquid.glassBlurIntensity}
        style={StyleSheet.absoluteFill}
      />
      {/* 블러 위 유리 채움 — BlurView 배경색은 블러를 가리므로 별도 레이어로 얹는다. */}
      <View style={[StyleSheet.absoluteFill, styles.fill]} />
      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.shadow, style]}
        onPress={onPress}
        activeOpacity={LiquidMotion.pressOpacity}
        hitSlop={TOUCH_SLOP}
        accessibilityRole='button'
        accessibilityLabel={accessibilityLabel}
      >
        {surface}
      </TouchableOpacity>
    );
  }

  return <View style={[styles.shadow, style]}>{surface}</View>;
};

const styles = StyleSheet.create({
  // 그림자는 바깥 래퍼가 진다 — 채움 레이어를 알약으로 깎는 overflow:'hidden'과 같은
  // 뷰에 두면 그림자까지 잘린다(검색 필드와 같은 구조).
  shadow: {
    borderRadius: LIQUID_CHROME_HEIGHT / 2,
    boxShadow: LiquidShadow.glassSm,
  },
  surface: {
    height: LIQUID_CHROME_HEIGHT,
    borderRadius: LIQUID_CHROME_HEIGHT / 2,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: Liquid.glassStroke,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: {
    backgroundColor: Liquid.glassFill,
  },
});

export default LiquidGlassCapsule;
