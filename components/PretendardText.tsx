import React from 'react';
import { Text, TextProps } from 'react-native';
import { Liquid } from '@/constants/DesignTokens';

interface PretendardTextProps extends TextProps {
  weight?: 'regular' | 'medium' | 'semibold' | 'bold' | 'extraBold';
}

const PretendardText: React.FC<PretendardTextProps> = ({
  style,
  weight = 'regular',
  lineBreakStrategyIOS = 'hangul-word',
  ...props
}) => {
  const fontFamily = getFontFamily(weight);

  return (
    <Text
      // 색을 안 준 호출부의 기본값. 순수 검정은 이 팔레트에 없어(잉크 스케일이 명도로만
      // 위계를 낸다) 리터럴 대신 `Liquid.ink`를 깐다. 호출부 style이 항상 덮을 수 있다.
      style={[{ fontFamily, color: Liquid.ink }, style]}
      lineBreakStrategyIOS={lineBreakStrategyIOS}
      {...props}
    />
  );
};

const getFontFamily = (
  weight: 'regular' | 'medium' | 'semibold' | 'bold' | 'extraBold'
): string => {
  switch (weight) {
    case 'medium':
      return 'Pretendard-Medium';
    case 'semibold':
      return 'Pretendard-SemiBold';
    case 'bold':
      return 'Pretendard-Bold';
    case 'extraBold':
      return 'Pretendard-ExtraBold';
    default:
      return 'Pretendard-Regular';
  }
};

export default PretendardText;
