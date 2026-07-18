import { FC } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Color, Radius } from '@/constants/DesignTokens';

// 즐겨찾기 등록 상태의 별 색(CS-9) — 마커 캠핑장색과 동일한 시맨틱 노랑 리터럴(브랜드 액센트 아님).
const FAVORITE_STAR_COLOR = '#FFD700';

interface Props {
  selected: boolean;
  onPress: () => void;
}

// 지도 유형 칩 1행의 `전체` 앞에 두는 ★ 필터 칩(CS-9). 아이콘 전용이라
// accessibilityLabel을 명시하고, 공용 CategoryChipView의 아웃라인 톤(비선택 테두리 /
// 선택 검정 채움)을 그대로 따라 이웃 칩과 시각적으로 통일한다.
const CampSiteFavoriteChipView: FC<Props> = ({ selected, onPress }) => {
  return (
    <TouchableOpacity
      style={[styles.chip, selected ? styles.chipSelected : styles.chipUnselected]}
      onPress={onPress}
      activeOpacity={0.7}
      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
      accessibilityRole='button'
      accessibilityLabel='즐겨찾기만 보기'
      accessibilityState={{ selected }}
    >
      <Ionicons
        name={selected ? 'star' : 'star-outline'}
        size={16}
        color={selected ? FAVORITE_STAR_COLOR : Color.textSecondary}
      />
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
  },
  chipUnselected: {
    backgroundColor: Color.background,
    borderColor: Color.chipBorder,
  },
  chipSelected: {
    backgroundColor: Color.chipActiveBg,
    borderColor: Color.chipActiveBg,
  },
});

export default CampSiteFavoriteChipView;
