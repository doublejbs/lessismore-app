import React, { FC, RefObject, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import CustomGear from '@/model/gear/custom/CustomGear';
import Gear from '@/model/gear/Gear';

export interface SearchResult {
  readonly id: string;
  readonly name: string;
  readonly company?: string;
}

interface Props {
  readonly label: string;
  readonly placeholder: string;
  readonly value: string;
  readonly onChangeText: (text: string) => void;
  readonly onFocus: () => void;
  readonly inputRef: RefObject<TextInput | null>;
  readonly customGear: CustomGear;
  readonly searchDebounceMs?: number;
}

const CustomGearInputSectionView: FC<Props> = ({
  label,
  placeholder,
  value,
  onChangeText,
  onFocus,
  inputRef,
  customGear,
  searchDebounceMs = 300,
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
      <Text style={styles.label}>{label}</Text>
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
            <ActivityIndicator size='small' color='#999' />
          </View>
        )}

        {!isSearching && value && (
          <TouchableOpacity
            onPress={handleClickClear}
            style={styles.clearButton}
          >
            <Ionicons name='close-circle' size={20} color='#B0B8C1' />
          </TouchableOpacity>
        )}
      </View>
      {showSearchResults && searchResults.length > 0 && (
        <ScrollView style={styles.searchResultsContainer}>
          {searchResults.map(item => (
            <TouchableOpacity
              key={item.getId()}
              style={styles.searchResultItem}
              onPress={() => handleSelectResult(item)}
            >
              <Text style={styles.searchResultName}>{item.getName()}</Text>
              {item.getCompany() && (
                <Text style={styles.searchResultCompany}>
                  {item.getCompany()}
                </Text>
              )}
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
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#F6F6F6',
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
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
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
    borderBottomColor: '#F0F0F0',
  },
  searchResultName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  searchResultCompany: {
    fontSize: 12,
    color: '#666',
  },
});

export default observer(CustomGearInputSectionView);
