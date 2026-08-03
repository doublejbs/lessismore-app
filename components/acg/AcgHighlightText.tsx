import { FC, ReactNode } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Acg } from '@/constants/DesignTokens';

interface Props {
  children: ReactNode;
  // 글자 높이. 형광펜 띠 높이를 이 값에서 뽑는다.
  fontSize: number;
  style?: StyleProp<ViewStyle>;
}

// 띠 높이는 글자의 46% — 시안 값. 실제 형광펜처럼 글자 아래쪽만 덮는다.
const BAND_RATIO = 0.46;

/**
 * 형광펜 하이라이트(ACG) — 화면 제목·섹션 제목 뒤에 라임 띠를 깐다.
 *
 * CSS는 `z-index:-1`로 텍스트 뒤에 두는데 RN에는 음수 z-index가 없다. 대신 띠를
 * **먼저 그리고**(absolute) 텍스트를 뒤에 그려 자연스럽게 위로 올라오게 한다.
 */
const AcgHighlightText: FC<Props> = ({ children, fontSize, style }) => {
  const bandHeight = Math.round(fontSize * BAND_RATIO);

  return (
    <View style={[styles.wrap, style]}>
      <View style={[styles.band, { height: bandHeight }]} />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
    justifyContent: 'flex-end',
  },
  band: {
    position: 'absolute',
    left: -2,
    right: -6,
    bottom: 2,
    backgroundColor: Acg.lime,
    transform: [{ rotate: '-0.6deg' }],
  },
});

export default AcgHighlightText;
