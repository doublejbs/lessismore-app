import React, { FC } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import CustomGear from '@/model/gear/custom/CustomGear';
import { observer } from 'mobx-react-lite';
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
      <Text style={styles.label}>색상</Text>
      <TextInput
        style={styles.input}
        placeholder={'색상을 입력해주세요'}
        onChangeText={handleChangeColor}
        value={color}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    borderRadius: 10,
    backgroundColor: '#F6F6F6',
    padding: 16,
  },
});

export default observer(CustomGearColorView);
