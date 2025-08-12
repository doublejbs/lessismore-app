import React, { FC } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import CustomGear from '@/model/gear/custom/CustomGear';

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
      {errorMessage && <Text style={styles.errorMessage}>{errorMessage}</Text>}
      <TouchableOpacity
        style={styles.confirmButton}
        onPress={handleClickConfirm}
      >
        <Text style={styles.confirmButtonText}>확인</Text>
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
    backgroundColor: 'black',
    paddingVertical: 18,
    paddingHorizontal: 133,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: 'white',
    textAlign: 'center',
  },
});

export default observer(CustomGearConfirmView);
