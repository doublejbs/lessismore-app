import { observer } from 'mobx-react-lite';
import { FC } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import SearchTopKeywordsView from './SearchTopKeywordsView';
import Bag from '@/model/bag/Bag';
import SearchResultContentView from './SearchResultContentView';

interface Props {
  searchWarehouse: SearchWarehouse;
  bag: Bag;
  children?: React.ReactNode;
}

const SearchResultView: FC<Props> = ({ searchWarehouse, bag, children }) => {
  const keyword = searchWarehouse.getKeyword();
  const isEmpty = searchWarehouse.isEmpty();
  const canLoadMore = searchWarehouse.canLoadMore();
  const isLoading = searchWarehouse.isLoading();
  const result = searchWarehouse.getResult();

  const handleLoadMore = () => {
    searchWarehouse.searchMore();
  };

  const render = () => {
    switch (true) {
      case !keyword.length: {
        return (
          <SearchTopKeywordsView searchWarehouse={searchWarehouse} bag={bag} />
        );
      }
      case isEmpty && !isLoading: {
        return (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>검색 결과가 없습니다</Text>
          </View>
        );
      }
      default: {
        return (
          <SearchResultContentView
            result={result}
            canLoadMore={canLoadMore}
            handleLoadMore={handleLoadMore}
            searchWarehouse={searchWarehouse}
            bag={bag}
          >
            {children}
          </SearchResultContentView>
        );
      }
    }
  };

  return <View style={styles.container}>{render()}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    fontFamily: 'Pretendard-Regular',
  },
  flatListContent: {
    flexGrow: 1,
    paddingBottom: 80,
  },
  skeletonContainer: {
    marginTop: 10,
  },
});

export default observer(SearchResultView);
