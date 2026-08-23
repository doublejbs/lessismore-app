import { forwardRef, useRef, useImperativeHandle } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Acg, AcgType, Color } from '@/constants/DesignTokens';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import SearchBarVariant from './SearchBarVariant';
import { observer } from 'mobx-react-lite';
import app from '@/model/app/App';

interface Props {
  searchWarehouse: SearchWarehouse;
  // 기본은 기존 유리 면 톤. `Plain`은 레퍼런스 톤 — 좌측 돋보기 + 17pt 입력·플레이스홀더.
  variant?: SearchBarVariant;
}

export interface SearchBarInputHandle {
  focus: () => void;
}

const SUGGESTION_KEYWORDS = [
  'search.suggestions.nemo',
  'search.suggestions.hyperliteMountainGear',
  'search.suggestions.yamatomichi',
  'search.suggestions.kolonSport',
  'search.suggestions.arcteryx',
  'search.suggestions.kailas',
  'search.suggestions.rab',
  'search.suggestions.color',
  'search.suggestions.helinox',
];

// 레퍼런스: 좌측 돋보기 24pt 잉크.
const PLAIN_LEADING_ICON_SIZE = 20;

const SearchBarInputView = forwardRef<SearchBarInputHandle, Props>(
  ({ searchWarehouse, variant = SearchBarVariant.Glass }, ref) => {
    const keyword = searchWarehouse.getKeyword();
    const inputRef = useRef<TextInput>(null);
    const isPlain = variant === SearchBarVariant.Plain;
    const l10n = app.getL10n();

    useImperativeHandle(ref, () => ({
      focus: () => {
        inputRef.current?.focus();
      },
    }));
    const suggestionKeyword = l10n.t(
      SUGGESTION_KEYWORDS[
        Math.floor(Math.random() * SUGGESTION_KEYWORDS.length)
      ]
    );
    const placeholder = l10n.t('search.input.placeholder', {
      keyword: `'${suggestionKeyword}'`,
    });

    const handleChange = (text: string) => {
      searchWarehouse.changeKeyword(text);
    };

    const handleClickClear = () => {
      searchWarehouse.clearKeyword();
    };

    return (
      <View style={styles.container}>
        {isPlain ? (
          <Ionicons
            name='search'
            size={PLAIN_LEADING_ICON_SIZE}
            color={Acg.ink}
            style={styles.leadingIcon}
          />
        ) : null}
        <TextInput
          ref={inputRef}
          style={[styles.input, isPlain && styles.plainInput]}
          value={keyword}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor={isPlain ? Acg.textMuted : Color.textSecondary}
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
  leadingIcon: {
    marginRight: 12,
  },
  input: {
    // 단일행 입력이라 줄간은 싣지 않는다(안드로이드에서 커서가 어긋난다).
    fontSize: AcgType.control.fontSize,
    letterSpacing: AcgType.control.letterSpacing,
    flex: 1,
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
  plainInput: {
    color: Acg.ink,
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

SearchBarInputView.displayName = 'SearchBarInputView';

export default observer(SearchBarInputView);
