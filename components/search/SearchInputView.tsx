import { forwardRef, useRef, useImperativeHandle } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Liquid } from '@/constants/DesignTokens';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import { josa } from 'josa';
import { observer } from 'mobx-react-lite';

interface Props {
  searchWarehouse: SearchWarehouse;
}

export interface SearchBarInputHandle {
  focus: () => void;
}

/**
 * 지우기 버튼 터치 여유.
 *
 * 버튼은 28pt로 그린다 — 키우면 유리 필드(h48) 안쪽 여백을 먹어 입력줄이 눌린다.
 * HIG 최소 타깃 44는 여유로만 채운다. (44 − 28) / 2 = 8.
 */
const CLEAR_HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

const SuggestionKeywords = [
  '니모',
  '하이퍼라이트마운틴기어',
  '야마토미치',
  '코오롱스포츠',
  '아크테릭스',
  '케일',
  '랩',
  '꼴로르',
  '헬리녹스',
];

const SearchBarInputView = forwardRef<SearchBarInputHandle, Props>(
  ({ searchWarehouse }, ref) => {
    const keyword = searchWarehouse.getKeyword();
    const inputRef = useRef<TextInput>(null);

    useImperativeHandle(ref, () => ({
      focus: () => {
        inputRef.current?.focus();
      },
    }));
    const placeholder = `${josa(
      `'${
        SuggestionKeywords[
          Math.floor(Math.random() * SuggestionKeywords.length)
        ]
      }'#{을}`
    )} 검색해보세요`;

    const handleChange = (text: string) => {
      searchWarehouse.changeKeyword(text);
    };

    const handleClickClear = () => {
      searchWarehouse.clearKeyword();
    };

    return (
      <View style={styles.container}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={keyword}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor={Liquid.inkMuted}
          autoCapitalize='none'
          autoCorrect={false}
        />
        <TouchableOpacity
          onPress={handleClickClear}
          style={[styles.clearButton, !keyword && styles.hidden]}
          disabled={!keyword}
          hitSlop={CLEAR_HIT_SLOP}
          accessibilityRole='button'
          accessibilityLabel='검색어 지우기'
        >
          <Ionicons name='close-circle' size={20} color={Liquid.inkSubtle} />
        </TouchableOpacity>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  input: {
    flex: 1,
    // TextInput은 PretendardText로 감쌀 수 없어 서체를 직접 지정한다 —
    // 지정하지 않으면 입력값만 시스템 서체로 렌더돼 화면에서 튄다. 값은 15.5/500(핸드오프 §3).
    fontFamily: 'Pretendard-Medium',
    fontSize: 15.5,
    color: Liquid.ink,
    padding: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    ...Platform.select({
      ios: {
        paddingVertical: 0,
      },
      android: {
        paddingVertical: 0,
      },
    }),
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 28,
    minWidth: 28,
  },
  hidden: {
    opacity: 0,
  },
});

export default observer(SearchBarInputView);
