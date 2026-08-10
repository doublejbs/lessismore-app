import { forwardRef } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import GearEdit from '@/model/gear/edit/GearEdit';
import { observer } from 'mobx-react-lite';
import LiquidFieldLabel from '@/components/liquid/LiquidFieldLabel';
import {
  Liquid,
  LiquidFont,
  LiquidLayout,
  LiquidRadius,
  LiquidType,
} from '@/constants/DesignTokens';

interface Props {
  gearEdit: GearEdit;
  onFocus?: () => void;
}

const GearEditWeightView = forwardRef<TextInput, Props>(
  ({ gearEdit, onFocus }, ref) => {
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
      <View style={styles.field}>
        <LiquidFieldLabel>무게(g)</LiquidFieldLabel>
        <TextInput
          ref={ref}
          style={[styles.input, weight ? styles.inputValue : null]}
          onChangeText={handleChangeWeight}
          value={String(weight)}
          placeholder='무게를 입력해주세요'
          accessibilityLabel='무게(g)'
          keyboardType='numeric'
          placeholderTextColor={Liquid.inkMuted}
          onFocus={onFocus}
        />
      </View>
    );
  }
);

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
  /**
   * 값이 들어오면 콘덴스드로 바꾼다 — 무게는 이 앱의 수치라 어디서나 같은 서체로 읽힌다.
   * 플레이스홀더는 한글이라 그대로 Pretendard를 유지한다(Archivo Narrow에 한글 글리프가 없다).
   */
  inputValue: {
    fontFamily: LiquidFont.condensed,
    fontSize: 17,
  },
});

export default observer(GearEditWeightView);
