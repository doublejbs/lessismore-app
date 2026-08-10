import { FC } from 'react';
import {
  View,
  StyleSheet,
  StyleProp,
  TextInput,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LiquidGlassField from '@/components/liquid/LiquidGlassField';
import { Liquid } from '@/constants/DesignTokens';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  /**
   * 인풋이 무엇을 찾는 자리인지 알린다. 필드에 보이는 라벨이 플레이스홀더뿐이라
   * 값이 채워지면 스크린리더에 남는 설명이 없다.
   */
  accessibilityLabel: string;
  /** 지우기 버튼 동작. 없으면 빈 문자열로 되돌린다(모델이 따로 처리할 때만 넘긴다) */
  onClear?: () => void;
  autoFocus?: boolean;
  /** 행 안에 놓을 때 `flex: 1`을 넘긴다. 기본은 부모 폭을 그대로 채운다 */
  style?: StyleProp<ViewStyle>;
}

/**
 * 지우기 버튼 터치 여유. 버튼은 28로 그린다 — 키우면 필드 안쪽 여백을 먹어 입력줄이
 * 눌린다. HIG 44는 여유로만 채운다: (44 − 28) / 2 = 8.
 */
const CLEAR_HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

/**
 * Liquid Depth 유리 검색 필드(목업 §2·§3).
 *
 * 유리 면은 공용 셸(`LiquidGlassField`)이 그리고, 이 컴포넌트는 그 안에 돋보기 → 인풋 →
 * 지우기 한 줄을 담는다. 창고 검색(WH-8)·브랜드 디렉토리(SR-8)·브랜드 필터 시트(FD-3)가
 * 같은 컴포넌트를 쓴다 — 세 곳이 각자 그리면 값이 갈린다.
 */
const LiquidSearchField: FC<Props> = ({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
  onClear,
  autoFocus = false,
  style,
}) => {
  const hasValue = value.length > 0;

  const handlePressClear = () => {
    if (onClear) {
      onClear();

      return;
    }

    onChangeText('');
  };

  return (
    <LiquidGlassField filled={hasValue} style={style}>
      {/* 누를 대상이 아니라 인풋을 담는 줄이다 — 탭은 TextInput 자신이 받는다. */}
      <View style={styles.body}>
        <Ionicons
          name='search'
          size={18}
          color={hasValue ? Liquid.ink : Liquid.inkMuted}
        />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Liquid.inkMuted}
          autoCapitalize='none'
          autoCorrect={false}
          autoFocus={autoFocus}
          returnKeyType='search'
          accessibilityLabel={accessibilityLabel}
        />
        {hasValue ? (
          <TouchableOpacity
            onPress={handlePressClear}
            style={styles.clearButton}
            hitSlop={CLEAR_HIT_SLOP}
            accessibilityRole='button'
            accessibilityLabel='검색어 지우기'
          >
            <Ionicons name='close-circle' size={20} color={Liquid.inkSubtle} />
          </TouchableOpacity>
        ) : null}
      </View>
    </LiquidGlassField>
  );
};

const styles = StyleSheet.create({
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  input: {
    flex: 1,
    // TextInput은 PretendardText로 감쌀 수 없어 서체를 직접 지정한다 — 지정하지 않으면
    // 입력값만 시스템 서체로 렌더돼 화면에서 튄다. 값은 15.5/500(핸드오프 §3).
    fontFamily: 'Pretendard-Medium',
    fontSize: 15.5,
    color: Liquid.ink,
    padding: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  clearButton: {
    minWidth: 28,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default LiquidSearchField;
