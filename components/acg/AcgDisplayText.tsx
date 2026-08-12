import { FC } from 'react';
import { Text, StyleSheet, StyleProp, TextStyle } from 'react-native';
import { Acg, AcgFont } from '@/constants/DesignTokens';

interface Props {
  children: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

/**
 * 디스플레이·수치용 콘덴스드 텍스트(Archivo Narrow 700).
 *
 * 앱 규칙은 텍스트에 `PretendardText`를 쓰고 raw `<Text>`를 금지하는데, 그 규칙의 뜻은
 * **서체를 화면마다 임의로 지정하지 말라**는 것이다. ACG 시안이 본문(Pretendard)과 별개로
 * 콘덴스드 서체를 요구하므로, 임의 `fontFamily` 대신 이 컴포넌트 하나로 통로를 만든다.
 *
 * **한글에는 쓰지 않는다.** Archivo Narrow에는 한글 글리프가 없다. 시안 HTML은
 * `'Archivo Narrow', Pretendard` 폴백 체인이라 한글이 자동으로 Pretendard로 떨어지지만,
 * **RN은 폰트 폴백을 지원하지 않아** 글자가 깨진다(실기기 확인: `홈` → `옴`).
 * 그래서 쓰는 곳은 **숫자·라틴 문자**뿐이다 — 무게, D-day, 기간, 진행 수치.
 * 한글 제목·본문·버튼 라벨은 `PretendardText`를 쓴다.
 *
 * `fontVariant: ['tabular-nums']`를 두는 이유: 세로로 나열해 서로 비교하는 수치(무게 등)가
 * 자릿수마다 폭이 달라 흔들리지 않게 고정폭 숫자로 렌더링한다.
 * `maxFontSizeMultiplier={1.5}`를 두는 이유: 이 수치는 화면의 시각 앵커라, 접근성 글자 확대가
 * 걸려도 레이아웃이 무너지지 않도록 배율을 1.5배로 상한을 둔다.
 */
const AcgDisplayText: FC<Props> = ({ children, style, numberOfLines }) => {
  return (
    <Text
      style={[styles.text, style]}
      numberOfLines={numberOfLines}
      maxFontSizeMultiplier={1.5}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  text: {
    fontFamily: AcgFont.condensed,
    color: Acg.ink,
    fontVariant: ['tabular-nums'],
  },
});

export default AcgDisplayText;
