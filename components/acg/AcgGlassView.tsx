import { FC, ReactNode } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Acg, AcgShadow } from '@/constants/DesignTokens';
import AcgGlassTint from './AcgGlassTint';

interface Props {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  // 유리 면이 떠 보이도록 드리우는 그림자. 바닥에 붙는 면(필터 바 등)은 끈다.
  elevated?: boolean;
  // 채움 계열. 기본은 밝은 유리.
  tint?: AcgGlassTint;
  // 뒤가 밝거나 복잡해(지도 타일, 임의의 화면 위 토스트) 표준 채움으로는 글자가 겹쳐
  // 읽히는 자리에서 켠다. 블러 강도만으로는 못 덮어 채움 자체를 올린다.
  dense?: boolean;
  /**
   * 누를 수 있는 면인지. 시스템 유리는 이 값이 켜지면 터치를 따라 빛이 휘어(스펙큘러
   * 하이라이트가 손가락 쪽으로 몰림) 재질이 살아 있다는 신호를 낸다 — 플로팅 버튼처럼
   * 면 자체가 컨트롤인 자리에만 켠다. 바·오버레이 같은 담는 면은 끈다.
   */
  interactive?: boolean;
}

// 블러가 없는 플랫폼은 채움만으로 면을 세운다 — Android·Web은 BlurView 비용이 크고
// 결과도 약해 폴백으로 둔다.
const IS_IOS = Platform.OS === 'ios';

// 블러 강도. 떠 있는 크롬은 뒤 콘텐츠가 실제로 스크롤·팬 되므로, 굴절이 움직임으로
// 읽힐 만큼은 올리고 글자 대비를 깨뜨릴 만큼은 올리지 않는다.
// - clear 40: 밝은 채움(78%)이 이미 빛을 대부분 막아 기존 30에서는 블러가 거의 안 보였다.
// - ink 25: 어두운 채움(70%)에 dark 블러가 겹치면 25에서도 뒤가 충분히 뭉개진다. 더 올리면
//   면이 사실상 불투명해져 유리로 읽히지 않는다.
const CLEAR_BLUR_INTENSITY = 40;
const INK_BLUR_INTENSITY = 25;

/**
 * 유리 면(리퀴드 글래스) — 검색 필드·플로팅 버튼·하단 바·지도 오버레이·토스트.
 *
 * **iOS 26에서는 시스템 재질(`UIGlassEffect`)을 그대로 쓴다.** `expo-glass-effect`의
 * `GlassView`가 그것이며, 탭바(`NativeTabs`)가 쓰는 재질과 같다 — 그래서 탭바만 유리로
 * 보이고 나머지는 반투명 판때기로 보이던 차이가 사라진다.
 *
 * 직접 흉내내지 않는 이유: 리퀴드 글래스를 알아보게 하는 것은 블러가 아니라 **엣지의
 * 스펙큘러 하이라이트와 뒤 콘텐츠의 굴절**이고, 둘 다 `expo-blur`로는 낼 수 없다.
 * 블러 + 반투명 채움 + 테두리로 맞추면 평평한 지면 위에서는 그냥 반투명 알약이 된다
 * (2026-08-11 실기 확인 — 사용자가 변화를 알아채지 못했다).
 *
 * 폴백: iOS 26 미만·Android·Web은 `BlurView`(iOS) 또는 채움만(그 외)으로 내려간다.
 * 시스템 재질이 채움·엣지를 스스로 그리므로, 그 경로에서는 우리 채움을 덮지 않는다 —
 * 덮으면 굴절이 가려져 효과가 죽는다.
 *
 * 이 컴포넌트는 **떠 있는 크롬 전용**이다. 목록 행·카드·시트 내부·모달 콘텐츠는
 * 콘텐츠 레이어라 유리를 입히지 않는다(specs/LiquidGlassNavigation.md LG-4).
 */
const AcgGlassView: FC<Props> = ({
  children,
  style,
  elevated = true,
  tint = AcgGlassTint.Clear,
  dense = false,
  interactive = false,
}) => {
  const isInk = tint === AcgGlassTint.Ink;

  if (isLiquidGlassAvailable()) {
    return (
      <GlassView
        style={[styles.container, elevated && styles.elevated, style]}
        // `clear`는 뒤가 거의 그대로 보이고 `regular`는 한 겹 더 확산된다. 잉크 면은
        // 흰 글자를 얹어야 해 확산이 필요하고, 밝은 면은 뒤가 비쳐야 유리로 읽힌다.
        glassEffectStyle={isInk ? 'regular' : 'clear'}
        // 잉크 틴트는 색으로 준다 — 시스템이 그 색을 재질에 녹여 굴절·하이라이트를 유지한다.
        // 채움 View를 덮는 방식은 그 둘을 가려 버린다.
        {...(isInk ? { tintColor: Acg.glassInkTint } : {})}
        isInteractive={interactive}
      >
        {children}
      </GlassView>
    );
  }

  return (
    <View
      style={[
        styles.container,
        isInk ? styles.inkEdge : styles.clearEdge,
        styles.legacyEdge,
        elevated && styles.elevated,
        style,
      ]}
    >
      {IS_IOS ? (
        <BlurView
          intensity={isInk ? INK_BLUR_INTENSITY : CLEAR_BLUR_INTENSITY}
          tint={isInk ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View style={[StyleSheet.absoluteFill, resolveFillStyle(isInk, dense)]} />
      {children}
    </View>
  );
};

const resolveFillStyle = (isInk: boolean, dense: boolean): ViewStyle => {
  if (isInk) {
    if (!IS_IOS) {
      return styles.inkFillOpaque;
    }

    return dense ? styles.inkFillDense : styles.inkFill;
  }

  if (!IS_IOS) {
    return dense ? styles.fillDenseOpaque : styles.fillOpaque;
  }

  return dense ? styles.fillDense : styles.fill;
};

const styles = StyleSheet.create({
  container: {
    // 시안은 모서리를 각지게 둔다 — 원형 아이콘 버튼만 예외이며 호출측이 지정한다.
    borderRadius: 0,
    overflow: 'hidden',
  },
  /**
   * 폴백 경로에만 테두리를 준다. 지면(#F4F3EF)과 흉내 유리의 대비가 작아 헤어라인으로는
   * 경계가 안 보였다(2026-08-03 실기기 확인). 시스템 재질은 엣지를 스스로 그리므로
   * 테두리를 얹으면 그 하이라이트를 덮어 오히려 판때기로 보인다.
   */
  legacyEdge: {
    borderWidth: 1,
  },
  clearEdge: {
    borderColor: Acg.glassStroke,
    borderTopColor: Acg.glassStrokeTop,
  },
  inkEdge: {
    borderColor: Acg.glassInkStroke,
    borderTopColor: Acg.glassInkStrokeTop,
  },
  elevated: {
    boxShadow: AcgShadow.glass,
  },
  fill: {
    backgroundColor: Acg.glassFillSurface,
  },
  fillOpaque: {
    backgroundColor: Acg.glassFillSurfaceOpaque,
  },
  fillDense: {
    backgroundColor: Acg.glassFillDense,
  },
  fillDenseOpaque: {
    backgroundColor: Acg.glassFillDenseOpaque,
  },
  inkFill: {
    backgroundColor: Acg.glassInkFill,
  },
  inkFillDense: {
    backgroundColor: Acg.glassInkFillDense,
  },
  inkFillOpaque: {
    backgroundColor: Acg.glassInkFillOpaque,
  },
});

export default AcgGlassView;
