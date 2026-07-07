import { forwardRef, useRef, useImperativeHandle } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Color } from '@/constants/DesignTokens';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import { josa } from 'josa';
import { observer } from 'mobx-react-lite';

interface Props {
  searchWarehouse: SearchWarehouse;
}

export interface SearchBarInputHandle {
  focus: () => void;
}

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
          placeholderTextColor={Color.textSecondary}
          autoCapitalize='none'
          autoCorrect={false}
        />
        <TouchableOpacity
          onPress={handleClickClear}
          style={[styles.clearButton, !keyword && styles.hidden]}
          disabled={!keyword}
        >
          <Ionicons name='close-circle' size={20} color={Color.iconMuted} />
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
    fontSize: 16,
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
