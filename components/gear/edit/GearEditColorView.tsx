import { FC } from 'react';
import { View, TextInput } from 'react-native';
import GearEdit from '@/model/gear/edit/GearEdit';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import { AcgFontSize, Color, Radius } from '@/constants/DesignTokens';

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
        weight='medium'
        style={{
          fontSize: 14,
        }}
      >
        색상
      </PretendardText>
      <TextInput
        style={{
          borderRadius: Radius.input,
          backgroundColor: Color.inputBg,
          paddingHorizontal: 12,
          paddingVertical: 12,
          fontSize: AcgFontSize.rowSubtitle,
        }}
        placeholder='색상을 입력해주세요'
        onChangeText={handleChangeColor}
        value={color}
        placeholderTextColor={Color.textSecondary}
      />
    </View>
  );
};

export default observer(GearEditColorView);
