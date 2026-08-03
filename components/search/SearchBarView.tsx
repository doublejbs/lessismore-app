import { FC, useRef } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import { observer } from 'mobx-react-lite';
import SearchBarInputView, { SearchBarInputHandle } from './SearchInputView';
import { Acg, AcgLayout, Spacing } from '@/constants/DesignTokens';
import AcgGlassView from '@/components/acg/AcgGlassView';
import PretendardText from '@/components/PretendardText';

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
      {/* 화면 제목 44px(ACG). 형광펜 띠 없음 — 한글이라 콘덴스드도 쓰지 않는다. */}
      <View style={styles.titleRow}>
        <PretendardText weight='bold' style={styles.titleText}>
          탐색
        </PretendardText>
      </View>
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

const TITLE_SIZE = 44;

const styles = StyleSheet.create({
  titleRow: {
    paddingHorizontal: AcgLayout.screenH,
    paddingTop: 20,
    paddingBottom: 14,
  },
  titleText: {
    fontSize: TITLE_SIZE,
    letterSpacing: -0.88,
    lineHeight: TITLE_SIZE,
    color: Acg.ink,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AcgLayout.screenH,
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
