import { StyleSheet, Text, type TextProps } from 'react-native';
import { Acg, AcgType } from '@/constants/DesignTokens';

import { useThemeColor } from '@/hooks/useThemeColor';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export const ThemedText = ({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) => {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        style,
      ]}
      {...rest}
    />
  );
};

const styles = StyleSheet.create({
  default: {
    ...AcgType.rowSubtitle,
    fontFamily: 'Pretendard-Regular',
    color: Acg.ink,
  },
  defaultSemiBold: {
    ...AcgType.rowSubtitle,
    fontFamily: 'Pretendard-SemiBold',
    color: Acg.ink,
  },
  title: {
    // 스케일 밖 — 템플릿 히어로 크기
    fontSize: 32,
    lineHeight: 32,
    fontFamily: 'Pretendard-Bold',
    color: Acg.ink,
  },
  subtitle: {
    ...AcgType.sectionTitle,
    fontFamily: 'Pretendard-Bold',
    color: Acg.ink,
  },
  link: {
    ...AcgType.rowSubtitle,
    color: '#0a7ea4',
    fontFamily: 'Pretendard-Medium',
  },
});
