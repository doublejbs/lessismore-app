import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import { AcgType, Color, Radius } from '@/constants/DesignTokens';
import app from '@/model/app/App';

interface Props {
  title?: string;
  inputValue: string;
  disabled?: boolean;
  onChangeName: (text: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const BagTemplateSaveContent: FC<Props> = ({
  title = app.getL10n().t('bag.template.save'),
  inputValue,
  disabled = false,
  onChangeName,
  onConfirm,
  onCancel,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <PretendardText weight='bold' style={styles.title}>
        {title}
      </PretendardText>
      <View style={styles.inputSection}>
        <PretendardText weight='semibold' style={styles.inputLabel}>
          {app.getL10n().t('bag.template.nameLabel')}
        </PretendardText>
        <TextInput
          style={styles.textInput}
      placeholder={app.getL10n().t('bag.template.namePlaceholder')}
          placeholderTextColor={Color.textSecondary}
          value={inputValue}
          onChangeText={onChangeName}
          autoFocus
        />
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <PretendardText weight='semibold' style={styles.cancelButtonText}>
            {app.getL10n().t('common.cancel')}
          </PretendardText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.confirmButton, disabled && styles.confirmButtonDisabled]}
          onPress={onConfirm}
          disabled={disabled}
        >
          <PretendardText weight='semibold' style={styles.confirmButtonText}>
            {app.getL10n().t('common.save')}
          </PretendardText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Color.background,
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  title: {
    ...AcgType.sectionTitle,
    color: Color.textPrimary,
    marginBottom: 24,
  },
  inputSection: {
    gap: 10,
    marginBottom: 28,
  },
  inputLabel: {
    ...AcgType.sectionSubtitle,
    color: Color.textPrimary,
  },
  textInput: {
    borderRadius: Radius.input,
    backgroundColor: Color.surfaceMuted,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: AcgType.control.fontSize,
    letterSpacing: AcgType.control.letterSpacing,
    fontFamily: 'Pretendard-Regular',
    color: Color.textPrimary,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    flex: 1,
    minHeight: 52,
    backgroundColor: Color.surfaceMuted,
    borderRadius: Radius.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    ...AcgType.control,
    color: Color.textPrimary,
  },
  confirmButton: {
    flex: 1,
    minHeight: 52,
    backgroundColor: Color.chipActiveBg,
    borderRadius: Radius.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    ...AcgType.control,
    color: Color.background,
  },
});

export default observer(BagTemplateSaveContent);
