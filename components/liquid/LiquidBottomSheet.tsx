import { FC, ReactNode } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import {
  Liquid,
  LiquidLayout,
  LiquidRadius,
  LiquidShadow,
} from '@/constants/DesignTokens';

interface Props {
  children?: ReactNode;
  /** 시트 껍데기 — 자리(하단 고정)와 바깥 여백은 호출부가 잡는다 */
  style?: StyleProp<ViewStyle>;
  /** 안쪽 여백을 바꿀 때만. 기본은 목업 §12 로그인 시트의 28 / 20 / 44 */
  contentStyle?: StyleProp<ViewStyle>;
}

/**
 * Liquid Depth 바텀 시트 면(목업 §12 로그인 · 닉네임 편집).
 *
 * 화면 하단에 붙어 상단 모서리만 둥근 유리 면이다. RN에 `backdrop-filter`가 없어
 * BlurView + `glassFillStrong` 오버레이 + 상단 0.5px `glassStroke`로 근사한다.
 *
 * **그림자와 클리핑을 다른 뷰가 든다** — 같은 뷰에 `overflow: 'hidden'`과 `boxShadow`를
 * 함께 주면 그림자가 자기 경계에서 잘려 시트가 지면에서 떠 보이지 않는다
 * (`LiquidPillButton`의 유리 변형과 같은 처리).
 *
 * 네이티브 `formSheet` 라우트(박지 상세 등)와는 다른 자리다 — 그쪽 시트 크롬은
 * 시스템이 그리고(`sheetCornerRadius`), 이 컴포넌트는 RN `Modal` 안에서 직접 그린다.
 */
const LiquidBottomSheet: FC<Props> = ({ children, style, contentStyle }) => {
  return (
    <View style={[styles.shell, style]}>
      <View style={styles.clip}>
        <BlurView
          tint='light'
          intensity={Liquid.glassBlurIntensityStrong}
          style={StyleSheet.absoluteFill}
        />
        {/* 블러 위 유리 채움 — BlurView 배경색은 블러를 가리므로 별도 레이어로 얹는다. */}
        <View style={[StyleSheet.absoluteFill, styles.fill]} />
        <View style={[styles.content, contentStyle]}>{children}</View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  shell: {
    borderTopLeftRadius: LiquidRadius.sheetLg,
    borderTopRightRadius: LiquidRadius.sheetLg,
    boxShadow: LiquidShadow.sheet,
  },
  clip: {
    borderTopLeftRadius: LiquidRadius.sheetLg,
    borderTopRightRadius: LiquidRadius.sheetLg,
    overflow: 'hidden',
    borderTopWidth: 0.5,
    borderTopColor: Liquid.glassStroke,
  },
  fill: {
    backgroundColor: Liquid.glassFillStrong,
  },
  content: {
    paddingTop: 28,
    paddingHorizontal: LiquidLayout.screenH,
    // 홈 인디케이터 자리까지 내려가지 않게 넉넉히 비운다(목업 §12).
    paddingBottom: 44,
  },
});

export default LiquidBottomSheet;
