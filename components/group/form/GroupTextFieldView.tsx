import { FC } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { Acg, AcgRadius, AcgType } from '@/constants/DesignTokens';

interface Props {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  maxLength: number;
  editable: boolean;
  accessibilityLabel: string;
  // 여러 줄 입력(집합 메모 등)에만 true를 준다.
  multiline?: boolean;
}

/**
 * 그룹 폼의 텍스트 입력 (GRP-2 · GRP-7).
 *
 * **단일행 입력에는 `lineHeight`를 얹지 않는다** — iOS에서 글자가 아래로 치우쳐 상하 패딩이
 * 어긋난다. 여러 줄 입력에서만 줄간을 준다.
 */
const GroupTextFieldView: FC<Props> = ({
  value,
  onChangeText,
  placeholder,
  maxLength,
  editable,
  accessibilityLabel,
  multiline = false,
}) => {
  return (
    <TextInput
      style={[styles.input, multiline && styles.multiline]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={Acg.textMuted}
      maxLength={maxLength}
      editable={editable}
      multiline={multiline}
      returnKeyType={multiline ? 'default' : 'done'}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !editable }}
    />
  );
};

const styles = StyleSheet.create({
  input: {
    minHeight: 52,
    borderRadius: AcgRadius.thumb,
    backgroundColor: Acg.controlFill,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: AcgType.control.fontSize,
    letterSpacing: AcgType.control.letterSpacing,
    color: Acg.ink,
  },
  multiline: {
    minHeight: 88,
    lineHeight: AcgType.body.lineHeight,
    textAlignVertical: 'top',
  },
});

export default GroupTextFieldView;
