import React, { FC } from 'react';
import { View, TextInput } from 'react-native';
import GearEdit from '@/model/gear/edit/GearEdit';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';

interface GearEditColorViewProps {
  gearEdit: GearEdit;
}

const GearEditColorView: FC<GearEditColorViewProps> = ({ gearEdit }) => {
  const color = gearEdit.getColor();

  const handleChangeColor = (text: string) => {
    gearEdit.setColor(text);
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
        색상
      </PretendardText>
      <TextInput
        style={{
          borderRadius: 10,
          backgroundColor: '#F6F6F6',
          paddingHorizontal: 12,
          paddingVertical: 12,
          fontSize: 16,
        }}
        placeholder='색상을 입력해주세요'
        onChangeText={handleChangeColor}
        value={color}
        placeholderTextColor='#999'
      />
    </View>
  );
};

export default observer(GearEditColorView);
