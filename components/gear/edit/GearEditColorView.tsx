import { FC } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import GearEdit from '@/model/gear/edit/GearEdit';
import { observer } from 'mobx-react-lite';
import LiquidFieldLabel from '@/components/liquid/LiquidFieldLabel';
import {
  Liquid,
  LiquidLayout,
  LiquidRadius,
  LiquidType,
} from '@/constants/DesignTokens';

interface GearEditColorViewProps {
  gearEdit: GearEdit;
}

const GearEditColorView: FC<GearEditColorViewProps> = ({ gearEdit }) => {
  const color = gearEdit.getColor();

  const handleChangeColor = (text: string) => {
    gearEdit.setColor(text);
  };

  return (
    <View style={styles.field}>
      <LiquidFieldLabel>색상</LiquidFieldLabel>
      <TextInput
        style={styles.input}
        placeholder='색상을 입력해주세요'
        accessibilityLabel='색상'
        onChangeText={handleChangeColor}
        value={color}
        placeholderTextColor={Liquid.inkMuted}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  // 라벨(`LiquidFieldLabel`)이 자기 아래 여백 10을 들고 있어 gap을 겹치지 않는다.
  field: {
    flexDirection: 'column',
  },
  // 폼 안 다른 필드와 같은 알약 — `PretendardText`를 쓸 수 없어 서체를 직접 건다.
  input: {
    height: LiquidLayout.pillHeight,
    paddingHorizontal: 20,
    borderRadius: LiquidRadius.pill,
    backgroundColor: Liquid.surfaceSunken,
    fontFamily: 'Pretendard-Medium',
    fontSize: LiquidType.body.fontSize,
    color: Liquid.ink,
  },
});

export default observer(GearEditColorView);
