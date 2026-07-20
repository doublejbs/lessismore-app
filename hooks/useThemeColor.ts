/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export function useThemeColor(
  props: { light?: string | undefined; dark?: string | undefined },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  // useColorScheme()의 ColorSchemeName은 null 포함 넓은 타입이라 Colors 인덱스로 쓸 수 없다.
  const theme: 'light' | 'dark' = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
}
