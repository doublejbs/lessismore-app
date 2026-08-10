import { FC } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import {
  Liquid,
  LiquidLayout,
  LiquidMotion,
  LiquidType,
} from '@/constants/DesignTokens';

interface Props {
  label: string;
  selected: boolean;
  onPress: () => void;
}

// 공용 정렬 시트(`/sort-sheet`)의 옵션 행.
// 선택 시 라벨 semibold·잉크 + 우측 체크, 미선택 medium·보조 잉크(Liquid Depth).
const SortOptionRow: FC<Props> = ({ label, selected, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={LiquidMotion.pressOpacity}
      accessibilityRole='button'
      accessibilityState={{ selected }}
      hitSlop={{ top: 6, bottom: 6 }}
    >
      <PretendardText
        style={[styles.label, selected && styles.labelSelected]}
        weight={selected ? 'semibold' : 'medium'}
      >
        {label}
      </PretendardText>
      {selected ? (
        <Ionicons name='checkmark' size={20} color={Liquid.ink} />
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    minHeight: LiquidLayout.touchMin,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  label: {
    fontSize: LiquidType.body.fontSize,
    lineHeight: LiquidType.body.lineHeight,
    color: Liquid.inkSecondary,
  },
  labelSelected: {
    color: Liquid.ink,
  },
});

export default SortOptionRow;
