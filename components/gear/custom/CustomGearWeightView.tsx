import { forwardRef } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomGear from '@/model/gear/custom/CustomGear';
import { observer } from 'mobx-react-lite';
import LiquidFieldLabel from '@/components/liquid/LiquidFieldLabel';
import {
  Liquid,
  LiquidFont,
  LiquidLayout,
  LiquidMotion,
  LiquidRadius,
  LiquidType,
} from '@/constants/DesignTokens';

interface Props {
  customGear: CustomGear;
  onFocus?: () => void;
}

const CustomGearWeightView = forwardRef<TextInput, Props>(
  ({ customGear, onFocus }, ref) => {
    const weight = customGear.getWeight();

    const handleChangeWeight = (text: string) => {
      const trimmedValue = text.trim();

      if (trimmedValue.length) {
        const number = parseFloat(trimmedValue.replace(/[^0-9.-]/g, ''));

        if (isNaN(number)) {
          return;
        } else {
          customGear.setWeight(String(number));
        }
      } else {
        customGear.setWeight(trimmedValue);
      }
    };

    return (
      <View style={styles.container}>
        <LiquidFieldLabel>무게(g)</LiquidFieldLabel>
        <View style={styles.inputContainer}>
          <TextInput
            ref={ref}
            style={[styles.input, weight ? styles.inputValue : null]}
            onChangeText={handleChangeWeight}
            value={weight}
            placeholder='무게를 입력해주세요'
            accessibilityLabel='무게(g)'
            placeholderTextColor={Liquid.inkMuted}
            keyboardType='numeric'
            onFocus={onFocus}
          />
          {weight ? (
            <TouchableOpacity
              onPress={() => customGear.setWeight('')}
              style={styles.clearButton}
              activeOpacity={LiquidMotion.pressOpacity}
              accessibilityRole='button'
              accessibilityLabel='입력 지우기'
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name='close-circle'
                size={20}
                color={Liquid.inkSubtle}
              />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  }
);

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
  /**
   * 값이 들어오면 콘덴스드로 바꾼다 — 무게는 이 앱의 수치라 어디서나 같은 서체로 읽힌다.
   * 플레이스홀더는 한글이라 그대로 Pretendard를 유지한다(Archivo Narrow에 한글 글리프가 없다).
   */
  inputValue: {
    fontFamily: LiquidFont.condensed,
    fontSize: 17,
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

export default observer(CustomGearWeightView);
