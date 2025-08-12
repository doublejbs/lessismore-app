import React, { FC } from 'react';
import { View, TextInput } from 'react-native';
import GearEdit from '@/model/gear/edit/GearEdit';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';

interface Props {
  gearEdit: GearEdit;
}

const GearEditWeightView: FC<Props> = ({ gearEdit }) => {
  const weight = gearEdit.getWeight() || '';

  const handleChangeWeight = (text: string) => {
    const trimmedValue = text.trim();

    if (trimmedValue.length) {
      const number = parseFloat(trimmedValue.replace(/[^0-9.-]/g, ''));

      if (isNaN(number)) {
        return;
      } else {
        gearEdit.setWeight(String(number));
      }
    } else {
      gearEdit.setWeight(trimmedValue);
    }
  };

  return (
    <View
      style={{
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <PretendardText
        style={{
          fontSize: 14,
          fontWeight: '500',
        }}
      >
        무게(g)
      </PretendardText>
      <TextInput
        style={{
          borderRadius: 10,
          backgroundColor: '#F6F6F6',
          paddingHorizontal: 12,
          paddingVertical: 12,
          fontSize: 16,
        }}
        onChangeText={handleChangeWeight}
        value={String(weight)}
        placeholder='무게를 입력해주세요'
        keyboardType='numeric'
        placeholderTextColor='#999'
      />
    </View>
  );
};

export default observer(GearEditWeightView);
