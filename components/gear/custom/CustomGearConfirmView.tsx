import React, { FC } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import CustomGear from '@/model/gear/custom/CustomGear';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';

interface Props {
  customGear: CustomGear;
}

const CustomGearConfirmView: FC<Props> = ({ customGear }) => {
  const errorMessage = customGear.getErrorMessage();

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
        style={styles.confirmButton}
        onPress={handleClickConfirm}
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
  },
  confirmButton: {
    width: '100%',
    backgroundColor: Color.textPrimary,
    paddingVertical: 18,
    paddingHorizontal: 133,
    borderRadius: Radius.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

export default observer(CustomGearConfirmView);
