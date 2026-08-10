import { FC } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomGear from '@/model/gear/custom/CustomGear';
import { observer } from 'mobx-react-lite';
import LiquidFieldLabel from '@/components/liquid/LiquidFieldLabel';
import {
  Liquid,
  LiquidLayout,
  LiquidMotion,
  LiquidRadius,
  LiquidType,
} from '@/constants/DesignTokens';

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
      <LiquidFieldLabel>색상</LiquidFieldLabel>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder='색상을 입력해주세요'
          accessibilityLabel='색상'
          placeholderTextColor={Liquid.inkMuted}
          onChangeText={handleChangeColor}
          value={color}
        />
        {color ? (
          <TouchableOpacity
            onPress={() => customGear.setColor('')}
            style={styles.clearButton}
            activeOpacity={LiquidMotion.pressOpacity}
            accessibilityRole='button'
            accessibilityLabel='입력 지우기'
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name='close-circle' size={20} color={Liquid.inkSubtle} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // 라벨(`LiquidFieldLabel`)이 자기 아래 여백 10을 들고 있어 gap을 겹치지 않는다.
  container: {
    flexDirection: 'column',
  },
  inputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  /**
   * 폼 안 다른 필드와 같은 알약 — `PretendardText`를 쓸 수 없어 서체를 직접 건다.
   * 지우기 버튼이 겹쳐 앉으므로 우측 여백을 더 비운다.
   */
  input: {
    flex: 1,
    height: LiquidLayout.pillHeight,
    paddingLeft: 20,
    paddingRight: 48,
    borderRadius: LiquidRadius.pill,
    backgroundColor: Liquid.surfaceSunken,
    fontFamily: 'Pretendard-Medium',
    fontSize: LiquidType.body.fontSize,
    color: Liquid.ink,
  },
  clearButton: {
    position: 'absolute',
    right: 14,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 28,
    minWidth: 28,
  },
});

export default observer(CustomGearColorView);
