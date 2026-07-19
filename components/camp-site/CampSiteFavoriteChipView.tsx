import { FC } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Color, Radius } from '@/constants/DesignTokens';

interface Props {
  onPress: () => void;
}

// 유형 칩 1행의 `전체` 앞에 두는 ★ 칩(CS-9). 필터가 아니라 즐겨찾기 리스트 시트를 여는
// 액션 버튼이라 선택 상태가 없다. 아이콘 전용이라 accessibilityLabel을 명시하고,
// 공용 CategoryChipView의 아웃라인 톤(비선택 테두리)을 그대로 따라 이웃 칩과 통일한다.
const CampSiteFavoriteChipView: FC<Props> = ({ onPress }) => {
  return (
    <TouchableOpacity
      style={styles.chip}
      onPress={onPress}
      activeOpacity={0.7}
      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
      accessibilityRole='button'
      accessibilityLabel='즐겨찾기 목록'
    >
      <Ionicons name='star-outline' size={16} color={Color.textSecondary} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // CategoryChipView의 chip 치수와 맞춘다(minHeight 34, radius chip). 아이콘 전용이라
  // 가로 패딩만 좁히고, hitSlop으로 44pt 터치를 확보한다.
  chip: {
    minHeight: 34,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: Radius.chip,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Color.background,
    borderColor: Color.chipBorder,
  },
});

export default CampSiteFavoriteChipView;
