import { FC, useRef } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import { observer } from 'mobx-react-lite';
import SearchBarInputView, { SearchBarInputHandle } from './SearchInputView';
import { Color, Radius, Spacing } from '@/constants/DesignTokens';

interface Props {
  searchWarehouse: SearchWarehouse;
}

const SearchBarView: FC<Props> = ({ searchWarehouse }) => {
  const inputRef = useRef<SearchBarInputHandle>(null);

  const handlePressContainer = () => {
    inputRef.current?.focus();
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.searchContainer} onPress={handlePressContainer}>
        <SearchBarInputView ref={inputRef} searchWarehouse={searchWarehouse} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
    paddingRight: 20,
    paddingTop: 16,
    // 필터바까지 리듬 = 이 값 + 필터 paddingTop(8) = 20(Spacing.screenH). height 고정은 Dynamic Type에서 잘려 제거.
    paddingBottom: Spacing.item,
    backgroundColor: Color.background,
    gap: 4,
  },
  backButton: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  searchContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.input,
    backgroundColor: Color.inputBg,
  },
});

export default observer(SearchBarView);
