import { FC } from 'react';
import { View, TextInput } from 'react-native';
import GearEdit from '@/model/gear/edit/GearEdit';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import { AcgType, Color, Radius } from '@/constants/DesignTokens';

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
          ...AcgType.rowSubtitle,
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
          // 단일행 입력이라 lineHeight를 얹지 않는다(안드로이드에서 커서 높이가 어긋난다).
          fontSize: AcgType.control.fontSize,
          letterSpacing: AcgType.control.letterSpacing,
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
