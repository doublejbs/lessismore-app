import { FC } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Liquid, LiquidMotion } from '@/constants/DesignTokens';

interface Props {
  onPress: () => void;
}

// 닫기 원(목업 §10)은 36이고, HIG 44는 여유로 채운다: (44 − 36) / 2 = 4.
const CLOSE_BUTTON_SIZE = 36;
const CLOSE_HIT_SLOP = { top: 4, bottom: 4, left: 4, right: 4 };
const CLOSE_ICON_SIZE = 20;

/**
 * 시트 우상단 닫기 원(중립 배지 면, 목업 §10).
 *
 * 지도 위 시트(박지 상세 CS-3·즐겨찾기 목록 CS-9)는 뒤로가기 대신 이 원 하나로 닫는다.
 * 헤더 크롬의 유리 원과 달리 **종이 면 위 중립 배지**다 — 시트 안 지면에 함께 앉는 요소라
 * 뒤가 비쳐야 할 이유가 없다.
 */
const LiquidSheetCloseButton: FC<Props> = ({ onPress }) => {
  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      activeOpacity={LiquidMotion.pressOpacity}
      hitSlop={CLOSE_HIT_SLOP}
      accessibilityRole='button'
      accessibilityLabel='닫기'
    >
      <Ionicons name='close' size={CLOSE_ICON_SIZE} color={Liquid.ink} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: CLOSE_BUTTON_SIZE,
    height: CLOSE_BUTTON_SIZE,
    borderRadius: CLOSE_BUTTON_SIZE / 2,
    backgroundColor: Liquid.badgeFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default LiquidSheetCloseButton;
