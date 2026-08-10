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

// 시각 높이 38을 HIG 최소 터치 타깃 44pt로 채우는 여유. 캡슐 **자체가** 버튼일 때만 쓴다.
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
  /**
   * 누를 수 없는 상태 — 요청이 오가는 동안 재탭을 막는다(`onPress`가 있을 때만 뜻이 있다).
   * 면·투명도는 건드리지 않는다: 유리 크롬은 뒤 지면이 그대로 비쳐 흐리면 사라진 것처럼
   * 보이고, 이 화면들은 진행 표시를 주 액션 쪽에서 이미 내고 있다(지도 선택기의 현재 위치
   * 버튼과 같은 처리).
   */
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Liquid Depth 유리 크롬 셸(목업 §6·§7).
 *
 * 지면 위에 뜬 반투명 알약 하나를 그린다 — BlurView + `glassFill` 오버레이 + 0.5px
 * `glassStroke` 보더로 유리를 근사한다(RN에 backdrop-filter가 없다).
 * 아이콘 여러 개를 담는 액션 캡슐, 글자 하나를 담는 텍스트 알약이 같은 문법을 쓴다.
 *
 * **아이콘을 여러 개 담을 때의 터치 타깃**: 겉면이 알약으로 클리핑하므로(`surface`의
 * `overflow: 'hidden'`) 안쪽 아이콘의 히트 영역은 캡슐 높이(38) 밖으로 나가면 전달되지
 * 않는다 — 현 프리미티브 구조상의 제약이며 34×38이 그 안에서의 상한이다. 44가 필요하면
 * 클리핑을 안쪽 레이어로 한 겹 더 내리거나(채움만 깎고 히트 영역은 밖에 두기) 캡슐 자체를
 * 버튼으로 쓰면 된다 — 지오메트리가 아니라 구조가 정하는 값이다.
 */
const LiquidGlassCapsule: FC<Props> = ({
  children,
  paddingHorizontal = 0,
  gap,
  width,
  onPress,
  disabled = false,
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
        disabled={disabled}
        activeOpacity={LiquidMotion.pressOpacity}
        hitSlop={TOUCH_SLOP}
        accessibilityRole='button'
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
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
