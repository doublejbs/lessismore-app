import { FC, ReactNode } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Acg, AcgShadow } from '@/constants/DesignTokens';

interface Props {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  // 유리 면이 떠 보이도록 드리우는 그림자. 바닥에 붙는 면(필터 바 등)은 끈다.
  elevated?: boolean;
}

/**
 * 유리 면(ACG) — 검색 필드·칩·버튼·타일.
 *
 * CSS는 `backdrop-filter: blur(30px) saturate(180%)` + 흰색 50% 채움인데,
 * **RN에는 backdrop-filter가 없다.** 실제 블러는 `expo-blur`의 `BlurView`가 내고,
 * 그 위에 흰색 채움과 광택 헤어라인을 얹어 시안의 결을 맞춘다.
 *
 * inset 그림자(광택)도 RN에 없어 `glassStroke` 테두리로 근사한다 — 위쪽만 밝게 하는
 * 두 겹 inset은 재현할 수 없으므로 한 겹 테두리로 줄였다.
 */
const AcgGlassView: FC<Props> = ({ children, style, elevated = true }) => {
  return (
    <View style={[styles.container, elevated && styles.elevated, style]}>
      {/* Android는 BlurView 비용이 크고 결과도 약해, 반투명 채움만으로 대체한다. */}
      {Platform.OS === 'ios' ? (
        <BlurView intensity={30} tint='light' style={StyleSheet.absoluteFill} />
      ) : null}
      <View style={[StyleSheet.absoluteFill, styles.fill]} />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // 시안은 모서리를 각지게 둔다 — 원형 아이콘 버튼만 예외이며 호출측이 지정한다.
    overflow: 'hidden',
    // 지면(#F4F3EF)과 유리(흰 50%)의 대비가 작아 헤어라인으로는 경계가 안 보였다
    // (2026-08-03 실기기 확인) — 1px로 올리고 광택을 더 밝게 준다.
    borderWidth: 1,
    borderColor: Acg.glassStroke,
  },
  elevated: {
    boxShadow: AcgShadow.glass,
  },
  fill: {
    // 시안 값은 흰색 50%인데 CSS backdrop-filter(blur+saturate)가 함께 만들던 밝기를
    // RN에서 다 못 내서, 채움을 올려 면이 지면 위에 떠 보이게 한다.
    backgroundColor: 'rgba(255,255,255,0.78)',
  },
});

export default AcgGlassView;
