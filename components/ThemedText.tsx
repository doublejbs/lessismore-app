import { StyleSheet, Text, type TextProps } from 'react-native';
import { AcgFontSize } from '@/constants/DesignTokens';

import { useThemeColor } from '@/hooks/useThemeColor';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
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
}

const styles = StyleSheet.create({
  default: {
    fontSize: AcgFontSize.rowSubtitle,
    lineHeight: 24,
    fontFamily: 'Pretendard-Regular',
    color: '#000000',
  },
  defaultSemiBold: {
    fontSize: AcgFontSize.rowSubtitle,
    lineHeight: 24,
    fontFamily: 'Pretendard-SemiBold',
    color: '#000000',
  },
  title: {
    fontSize: 32,
    lineHeight: 32,
    fontFamily: 'Pretendard-Bold',
    color: '#000000',
  },
  subtitle: {
    fontSize: 20,
    fontFamily: 'Pretendard-Bold',
    color: '#000000',
  },
  link: {
    lineHeight: 30,
    fontSize: AcgFontSize.rowSubtitle,
    color: '#0a7ea4',
    fontFamily: 'Pretendard-Medium',
  },
});
