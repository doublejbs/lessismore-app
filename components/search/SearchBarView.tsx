import { FC, useRef } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import { observer } from 'mobx-react-lite';
import SearchBarInputView, { SearchBarInputHandle } from './SearchInputView';
import { AcgLayout, Spacing } from '@/constants/DesignTokens';
import AcgGlassView from '@/components/acg/AcgGlassView';

interface Props {
  searchWarehouse: SearchWarehouse;
}

const SearchBarView: FC<Props> = ({ searchWarehouse }) => {
  const inputRef = useRef<SearchBarInputHandle>(null);

  const handlePressContainer = () => {
    inputRef.current?.focus();
  };

  return (
    <View>
      <View style={styles.container}>
        {/* 검색 필드는 유리 면(ACG). */}
        <AcgGlassView style={styles.searchGlass}>
          <Pressable
            style={styles.searchContainer}
            onPress={handlePressContainer}
          >
            <SearchBarInputView ref={inputRef} searchWarehouse={searchWarehouse} />
          </Pressable>
        </AcgGlassView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AcgLayout.screenH,
    // 제목을 걷어내 검색 필드가 화면 최상단이 됐다 — 제목이 쓰던 여백을 여기서 낸다.
    paddingTop: 20,
    // 필터바까지 리듬 = 이 값 + 필터 paddingTop(8) = 20(Spacing.screenH). height 고정은 Dynamic Type에서 잘려 제거.
    paddingBottom: Spacing.item,
    gap: 4,
  },
  searchGlass: {
    flex: 1,
  },
  backButton: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});

export default observer(SearchBarView);
