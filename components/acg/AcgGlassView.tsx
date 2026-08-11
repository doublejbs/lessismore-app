import { FC, ReactNode } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
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
 * 유리 면(ACG/리퀴드 글래스) — 검색 필드·플로팅 버튼·하단 바·지도 오버레이·토스트.
 *
 * CSS는 `backdrop-filter: blur(30px) saturate(180%)` + 반투명 채움인데,
 * **RN에는 backdrop-filter가 없다.** 실제 블러는 `expo-blur`의 `BlurView`가 내고,
 * 그 위에 채움과 광택 헤어라인을 얹어 재질을 맞춘다.
 *
 * inset 그림자(광택)도 RN에 없어 테두리로 근사한다 — 사방 한 겹이면 판때기로 보이므로
 * 위쪽만 밝게 줘 빛을 받은 엣지로 읽히게 한다.
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
}) => {
  const isInk = tint === AcgGlassTint.Ink;
  const fillStyle = resolveFillStyle(isInk, dense);

  return (
    <View
      style={[
        styles.container,
        isInk ? styles.inkEdge : styles.clearEdge,
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
      <View style={[StyleSheet.absoluteFill, fillStyle]} />
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
    // 지면(#F4F3EF)과 유리의 대비가 작아 헤어라인으로는 경계가 안 보였다
    // (2026-08-03 실기기 확인) — 1px로 올리고 위쪽 광택을 더 밝게 준다.
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
