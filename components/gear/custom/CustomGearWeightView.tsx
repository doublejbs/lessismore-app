import { forwardRef } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomGear from '@/model/gear/custom/CustomGear';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import { AcgType, Color, Radius } from '@/constants/DesignTokens';

interface Props {
  customGear: CustomGear;
  onFocus?: () => void;
}

const CustomGearWeightView = forwardRef<TextInput, Props>(
  ({ customGear, onFocus }, ref) => {
    const weight = customGear.getWeight();

    const handleChangeWeight = (text: string) => {
      const trimmedValue = text.trim();

      if (trimmedValue.length) {
        const number = parseFloat(trimmedValue.replace(/[^0-9.-]/g, ''));

        if (isNaN(number)) {
          return;
        } else {
          customGear.setWeight(String(number));
        }
      } else {
        customGear.setWeight(trimmedValue);
      }
    };

    return (
      <View style={styles.container}>
        <PretendardText weight='medium' style={styles.label}>
          무게(g)
        </PretendardText>
        <View style={styles.inputContainer}>
          <TextInput
            ref={ref}
            style={styles.input}
            onChangeText={handleChangeWeight}
            value={weight}
            placeholder={'무게를 입력해주세요'}
            keyboardType='numeric'
            onFocus={onFocus}
          />
          {weight ? (
            <TouchableOpacity
              onPress={() => customGear.setWeight('')}
              style={styles.clearButton}
              accessibilityRole='button'
              accessibilityLabel='입력 지우기'
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name='close-circle' size={20} color={Color.iconMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    gap: 12,
  },
  label: {
    ...AcgType.rowSubtitle,
  },
  inputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    // 단일행 TextInput — 줄간을 얹지 않는다(HM-8, 안드로이드 커서 이슈).
    fontSize: AcgType.control.fontSize,
    letterSpacing: AcgType.control.letterSpacing,
    borderRadius: Radius.input,
    backgroundColor: Color.inputBg,
    borderWidth: 1,
    borderColor: Color.borderLight,
    padding: 16,
  },
  clearButton: {
    position: 'absolute',
    right: 16,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 28,
    minWidth: 28,
  },
});

export default observer(CustomGearWeightView);
