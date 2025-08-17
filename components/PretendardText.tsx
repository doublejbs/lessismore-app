import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';

interface PretendardTextProps extends TextProps {
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
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
  weight: 'regular' | 'medium' | 'semibold' | 'bold'
): string => {
  switch (weight) {
    case 'medium':
      return 'Pretendard-Medium';
    case 'semibold':
      return 'Pretendard-SemiBold';
    case 'bold':
      return 'Pretendard-Bold';
    default:
      return 'Pretendard-Regular';
  }
};

export default PretendardText;
