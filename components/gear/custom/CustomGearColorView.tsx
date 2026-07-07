import React, { FC } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import CustomGear from '@/model/gear/custom/CustomGear';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';

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
        색상
      </PretendardText>
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
  },
  input: {
    borderRadius: Radius.input,
    backgroundColor: Color.inputBg,
    borderWidth: 1,
    borderColor: Color.borderLight,
    padding: 16,
  },
});

export default observer(CustomGearColorView);
