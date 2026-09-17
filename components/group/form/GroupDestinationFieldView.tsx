import { FC } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgRadius, AcgType } from '@/constants/DesignTokens';

interface Props {
  destinationName: string;
  placeholder: string;
  selectLabel: string;
  clearLabel: string;
  disabled: boolean;
  onPress: () => void;
  onClear: () => void;
}

/**
 * 그룹 폼의 여행지 칸 (GRP-2 · GRP-7).
 * 공용 여행지 선택기(`/bag-destination-picker`)를 여는 입구이고, 누를 수 있음은 색이 아니라
 * 셰브론으로 알린다(HM-8).
 */
const GroupDestinationFieldView: FC<Props> = ({
  destinationName,
  placeholder,
  selectLabel,
  clearLabel,
  disabled,
  onPress,
  onClear,
}) => {
  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.field}
        onPress={onPress}
        activeOpacity={0.7}
        disabled={disabled}
        accessibilityRole='button'
        accessibilityLabel={selectLabel}
        accessibilityState={{ disabled }}
      >
        <PretendardText
          style={[styles.text, !destinationName && styles.placeholder]}
          numberOfLines={1}
        >
          {destinationName || placeholder}
        </PretendardText>
        <Ionicons name='chevron-forward' size={18} color={Acg.textMuted} />
      </TouchableOpacity>
      {destinationName ? (
        <TouchableOpacity
          style={styles.clear}
          onPress={onClear}
          disabled={disabled}
          accessibilityRole='button'
          accessibilityLabel={clearLabel}
          accessibilityState={{ disabled }}
        >
          <Ionicons name='close-circle' size={20} color={Acg.textMuted} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  field: {
    flex: 1,
    minHeight: 52,
    borderRadius: AcgRadius.thumb,
    backgroundColor: Acg.controlFill,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  text: { ...AcgType.control, color: Acg.ink, flex: 1 },
  placeholder: { color: Acg.textMuted },
  clear: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default GroupDestinationFieldView;
