import { FC } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import CustomGear from '@/model/gear/custom/CustomGear';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';

const ERROR_RED = '#FF3B30';

interface Props {
  customGear: CustomGear;
}

const CustomGearConfirmView: FC<Props> = ({ customGear }) => {
  const errorMessage = customGear.getErrorMessage();
  const isDisabled = customGear.getName().trim().length === 0;

  const handleClickConfirm = async () => {
    await customGear.register();
  };

  return (
    <View style={styles.container}>
      {errorMessage && (
        <PretendardText style={styles.errorMessage}>
          {errorMessage}
        </PretendardText>
      )}
      <TouchableOpacity
        style={[
          styles.confirmButton,
          isDisabled && styles.confirmButtonDisabled,
        ]}
        onPress={handleClickConfirm}
        disabled={isDisabled}
        accessibilityRole='button'
        accessibilityState={{ disabled: isDisabled }}
      >
        <PretendardText weight='semibold' style={styles.confirmButtonText}>
          확인
        </PretendardText>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    gap: 16,
  },
  errorMessage: {
    width: '100%',
    textAlign: 'center',
    color: ERROR_RED,
  },
  confirmButton: {
    width: '100%',
    backgroundColor: Color.textPrimary,
    paddingVertical: 18,
    borderRadius: Radius.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.4,
  },
  confirmButtonText: {
    color: Color.background,
    textAlign: 'center',
  },
});

export default observer(CustomGearConfirmView);
