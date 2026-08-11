import { FC } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  LedgerColor,
  LedgerLayout,
  LedgerLine,
  LedgerSpace,
  LedgerType,
} from '@/constants/LedgerTokens';

interface Props {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  accessibilityLabel: string;
  /** 좌측 돋보기. 이 화면의 필드가 검색임을 여는 표식 하나만 허용한다 */
  showSearchIcon?: boolean;
  autoFocus?: boolean;
  /** 지우기 버튼 라벨. 값이 있을 때만 버튼이 뜬다 */
  clearLabel?: string;
  style?: StyleProp<ViewStyle>;
}

// 좌측 돋보기·우측 지우기 글리프 크기. 글자(14)보다 커지지 않게 둔다.
const ICON_SIZE = 16;

/**
 * Ledger 텍스트 입력.
 *
 * **면도 모서리도 없고 하단 헤어라인 하나뿐이다** — 입력은 종이에 그은 기입선이다. 유리
 * 캡슐·둥근 회색 면을 두면 필드가 지면에서 떠 카드가 하나 늘어난다.
 *
 * 높이는 `rowMin`(44)이라 우측 지우기 버튼이 그대로 44 터치 타깃이 된다.
 */
const LedgerField: FC<Props> = ({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
  showSearchIcon = false,
  autoFocus = false,
  clearLabel = '지우기',
  style,
}) => {
  const handlePressClear = () => {
    onChangeText('');
  };

  return (
    <View style={[styles.field, style]}>
      {showSearchIcon ? (
        <Ionicons name='search' size={ICON_SIZE} color={LedgerColor.inkQuiet} />
      ) : null}
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={LedgerColor.inkQuiet}
        accessibilityLabel={accessibilityLabel}
        autoFocus={autoFocus}
        autoCorrect={false}
        returnKeyType='search'
        // iOS 기본 클리어 버튼은 회색 원 면이라 이 문법과 어긋난다 — 아래 글리프로 대체한다.
        clearButtonMode='never'
      />
      {value.length > 0 ? (
        <TouchableOpacity
          style={styles.clearButton}
          onPress={handlePressClear}
          activeOpacity={0.7}
          accessibilityRole='button'
          accessibilityLabel={clearLabel}
        >
          <Ionicons
            name='close'
            size={ICON_SIZE}
            color={LedgerColor.inkTertiary}
          />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LedgerSpace.sm,
    minHeight: LedgerLayout.rowMin,
    borderBottomWidth: LedgerLine.hairline,
    borderBottomColor: LedgerColor.line,
  },
  /**
   * 서체를 직접 지정한다 — `TextInput`은 `PretendardText`를 쓸 수 없고(자식이 아니라 값이
   * 들어가는 자리) 기본값이 시스템 서체다.
   */
  input: {
    flex: 1,
    minWidth: 0,
    fontFamily: 'Pretendard-Regular',
    fontSize: LedgerType.body.fontSize,
    color: LedgerColor.ink,
    // Android는 기본 세로 패딩이 붙어 필드 안에서 글자가 아래로 밀린다.
    paddingVertical: 0,
  },
  /**
   * 필드 높이(44)를 그대로 써 터치 타깃을 만들고, 글리프는 상자 안에서 **우측에 붙인다** —
   * 가운데에 두면 44 상자만큼 안쪽으로 들어가 페이지 우측 축에서 벗어나 보인다.
   */
  clearButton: {
    width: LedgerLayout.rowMin,
    height: LedgerLayout.rowMin,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});

export default LedgerField;
