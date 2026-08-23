import { FC } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomGear from '@/model/gear/custom/CustomGear';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import { AcgType, Color, Radius } from '@/constants/DesignTokens';
import app from '@/model/app/App';

interface Props {
  customGear: CustomGear;
}

const CustomGearColorView: FC<Props> = ({ customGear }) => {
  const color = customGear.getColor();

  const handleChangeColor = (text: string) => {
    customGear.setColor(text);
  };

  return (
    <View style={styles.container}>
      <PretendardText weight='medium' style={styles.label}>
        {app.getL10n().t('gearEdit.color')}
      </PretendardText>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder={app.getL10n().t('gearEdit.colorPlaceholder')}
          onChangeText={handleChangeColor}
          value={color}
        />
        {color ? (
          <TouchableOpacity
            onPress={() => customGear.setColor('')}
            style={styles.clearButton}
            accessibilityRole='button'
            accessibilityLabel={app.getL10n().t('gearEdit.clearInput')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name='close-circle' size={20} color={Color.iconMuted} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

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

export default observer(CustomGearColorView);
