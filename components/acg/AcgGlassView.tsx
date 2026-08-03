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
    borderRadius: 0,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Acg.glassStroke,
  },
  elevated: {
    boxShadow: AcgShadow.glass,
  },
  fill: {
    backgroundColor: Acg.glassFill,
  },
});

export default AcgGlassView;
