import { FC } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { AcgFontSize, Color } from '@/constants/DesignTokens';

interface Props {
  label: string;
  selected: boolean;
  onPress: () => void;
}

// 공용 정렬 시트(`/sort-sheet`)의 옵션 행.
// 선택 시 라벨 semibold·textPrimary + 우측 체크, 미선택 regular·textSecondary.
const SortOptionRow: FC<Props> = ({ label, selected, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole='button'
      accessibilityState={{ selected }}
      hitSlop={{ top: 6, bottom: 6 }}
    >
      <PretendardText
        style={[styles.label, selected && styles.labelSelected]}
        weight={selected ? 'semibold' : 'regular'}
      >
        {label}
      </PretendardText>
      {selected ? (
        <Ionicons name='checkmark' size={20} color={Color.textPrimary} />
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  label: {
    fontSize: AcgFontSize.rowSubtitle,
    lineHeight: 19,
    color: Color.textSecondary,
  },
  labelSelected: {
    color: Color.textPrimary,
  },
});

export default SortOptionRow;
