import React from 'react';
import { Text, TextProps } from 'react-native';

interface PretendardTextProps extends TextProps {
  weight?: 'regular' | 'medium' | 'semibold' | 'bold' | 'extraBold';
}

const PretendardText: React.FC<PretendardTextProps> = ({
  style,
  weight = 'regular',
  ...props
}) => {
  const fontFamily = getFontFamily(weight);

  return <Text style={[{ fontFamily }, style]} {...props} />;
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
