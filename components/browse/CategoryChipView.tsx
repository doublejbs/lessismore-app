import { FC } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import PretendardText from '../PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';

interface Props {
  label: string;
  selected?: boolean;
  onPress: () => void;
}

// 탐색 홈 카테고리 그리드와 인기순위 카테고리 탭이 공유하는 칩 컴포넌트.
// 시각 토큰은 기존 인기순위 탭 스타일 기준으로 통일한다.
const CategoryChipView: FC<Props> = ({ label, selected = false, onPress }) => {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <PretendardText
        style={[styles.chipText, selected && styles.chipTextSelected]}
      >
        {label}
      </PretendardText>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    height: 32,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.chip,
    backgroundColor: Color.chipInactiveBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipSelected: {
    backgroundColor: Color.chipActiveBg,
  },
  chipText: {
    fontSize: 14,
    lineHeight: 16,
    color: Color.textPrimary,
  },
  chipTextSelected: {
    color: Color.background,
  },
});

export default CategoryChipView;
