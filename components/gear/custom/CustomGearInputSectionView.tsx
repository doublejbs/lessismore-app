import React, { FC, RefObject, useState, useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import CustomGear from '@/model/gear/custom/CustomGear';
import Gear from '@/model/gear/Gear';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';

const REQUIRED_RED = '#FF3B30';

export interface SearchResult {
  readonly id: string;
  readonly name: string;
  readonly company?: string;
}

interface Props {
  readonly label: string;
  readonly required?: boolean;
  readonly placeholder: string;
  readonly value: string;
  readonly onChangeText: (text: string) => void;
  readonly onFocus: () => void;
  readonly inputRef: RefObject<TextInput | null>;
  readonly customGear: CustomGear;
  readonly searchDebounceMs?: number;
  readonly onSearchScrollStart?: () => void;
  readonly onSearchScrollEnd?: () => void;
}

const CustomGearInputSectionView: FC<Props> = ({
  label,
  required,
  placeholder,
  value,
  onChangeText,
  onFocus,
  inputRef,
  customGear,
  searchDebounceMs = 300,
  onSearchScrollStart,
  onSearchScrollEnd,
}) => {
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchResults = customGear.getSearchResults();
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChangeText = (text: string) => {
    onChangeText(text);

    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    if (!text || text.length < 2) {
      customGear.clearSearchResults();
      setShowSearchResults(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        await customGear.searchName(text);
        setShowSearchResults(true);
      } catch (error) {
        console.error('검색 중 오류 발생:', error);
        customGear.clearSearchResults();
      } finally {
        setIsSearching(false);
      }
    }, searchDebounceMs);
  };

  const handleSelectResult = (item: Gear) => {
    customGear.selectSearchGear(item);
    setShowSearchResults(false);
    Keyboard.dismiss();
  };

  const handleFocus = () => {
    onFocus();
    if (searchResults.length > 0) {
      setShowSearchResults(true);
    }
  };

  const handleClickClear = () => {
    onChangeText('');
    customGear.clearSearchResults();
    setShowSearchResults(false);
  };

  return (
    <View style={styles.inputSection}>
      <View style={styles.labelContainer}>
        <PretendardText weight='medium' style={styles.label}>
          {label}
          {required && (
            <PretendardText weight='medium' style={{ color: REQUIRED_RED }}>
              {' '}
              *
            </PretendardText>
          )}
        </PretendardText>
        <PretendardText style={styles.guideText}>
          제품명을 입력하면 검색결과가 나옵니다
        </PretendardText>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={placeholder}
          onChangeText={handleChangeText}
          value={value}
          onFocus={handleFocus}
        />

        {isSearching && (
          <View style={styles.loadingIndicator}>
            <ActivityIndicator size='small' color={Color.textSecondary} />
          </View>
        )}

        {!isSearching && value && (
          <TouchableOpacity
            onPress={handleClickClear}
            style={styles.clearButton}
            accessibilityRole='button'
            accessibilityLabel='입력 지우기'
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name='close-circle' size={20} color={Color.iconMuted} />
          </TouchableOpacity>
        )}
      </View>
      {showSearchResults && searchResults.length > 0 && (
        <ScrollView
          style={styles.searchResultsContainer}
          nestedScrollEnabled={true}
          onScrollBeginDrag={onSearchScrollStart}
          onScrollEndDrag={onSearchScrollEnd}
          onMomentumScrollEnd={onSearchScrollEnd}
        >
          {searchResults.map(item => (
            <TouchableOpacity
              key={item.getId()}
              style={styles.searchResultItem}
              onPress={() => handleSelectResult(item)}
            >
              {item.getImageUrl() ? (
                <Image
                  source={{ uri: item.getImageUrl() }}
                  style={styles.searchResultImage}
                  resizeMode='cover'
                />
              ) : (
                <View style={styles.searchResultImagePlaceholder} />
              )}
              <View style={styles.searchResultInfo}>
                {item.getCompany() && (
                  <PretendardText style={styles.searchResultCompany}>
                    {item.getCompany()}
                  </PretendardText>
                )}
                <PretendardText weight='medium' style={styles.searchResultName}>
                  {item.getDisplayName()}
                </PretendardText>
                {item.getWeight() && (
                  <PretendardText
                    weight='medium'
                    style={styles.searchResultWeight}
                  >
                    {item.getWeight()}g
                  </PretendardText>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  inputSection: {
    flexDirection: 'column',
    gap: 12,
    zIndex: 1,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 14,
  },
  guideText: {
    fontSize: 12,
    color: Color.textSecondary,
  },
  inputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderRadius: Radius.input,
    backgroundColor: Color.inputBg,
    borderWidth: 1,
    borderColor: Color.borderLight,
    padding: 16,
  },
  loadingIndicator: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  clearButton: {
    position: 'absolute',
    right: 16,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 28,
    minWidth: 28,
  },
  searchResultsContainer: {
    backgroundColor: Color.background,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Color.borderLight,
    maxHeight: 200,
    overflow: 'scroll',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchResultItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Color.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchResultImage: {
    width: 50,
    height: 50,
    borderRadius: Radius.card,
    backgroundColor: Color.inputBg,
  },
  searchResultImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: Radius.card,
    backgroundColor: Color.inputBg,
  },
  searchResultInfo: {
    flex: 1,
    gap: 4,
  },
  searchResultName: {
    fontSize: 14,
    color: Color.textPrimary,
  },
  searchResultCompany: {
    fontSize: 12,
    color: Color.textTertiary,
  },
  searchResultWeight: {
    fontSize: 12,
  },
});

export default observer(CustomGearInputSectionView);
