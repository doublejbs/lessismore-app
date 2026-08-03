import { FC, ReactNode } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Acg, AcgShadow } from '@/constants/DesignTokens';

interface Props {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

// 종이 면(ACG) — 리스트 행·카드. 유리와 달리 불투명 흰 면이고 그림자는 아주 얕다.
const AcgPaperView: FC<Props> = ({ children, style }) => {
  return <View style={[styles.paper, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  paper: {
    backgroundColor: Acg.paper,
    borderRadius: 0,
    boxShadow: AcgShadow.paper,
  },
});

export default AcgPaperView;
