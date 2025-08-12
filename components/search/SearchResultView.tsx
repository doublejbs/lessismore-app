import { observer } from 'mobx-react-lite';
import { FC } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import SearchGearView from './SearchGearView';
import SearchSkeletonView from './SearchSkeletonView';
import Gear from '@/model/gear/Gear';

interface Props {
  searchWarehouse: SearchWarehouse;
  children?: React.ReactNode;
}

const SearchResultView: FC<Props> = ({ searchWarehouse, children }) => {
  const keyword = searchWarehouse.getKeyword();
  const isEmpty = searchWarehouse.isEmpty();
  const canLoadMore = searchWarehouse.canLoadMore();
  const isLoading = searchWarehouse.isLoading();
  const result = searchWarehouse.getResult();
  const hasSelected = searchWarehouse.hasSelected();

  const handleLoadMore = () => {
    searchWarehouse.searchMore();
  };

  const render = () => {
    switch (true) {
      case !keyword.length: {
        return <View />;
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
          <FlatList
            data={result}
            renderItem={({ item: gear }) => (
              <SearchGearView gear={gear} searchWarehouse={searchWarehouse} />
            )}
            keyExtractor={(gear: Gear) => gear.getId()}
            onEndReached={canLoadMore ? handleLoadMore : null}
            onEndReachedThreshold={0.1}
            ListFooterComponent={
              <>
                {children}
                {isLoading && (
                  <View style={styles.skeletonContainer}>
                    <SearchSkeletonView />
                  </View>
                )}
              </>
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.flatListContent}
          />
        );
      }
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: hasSelected ? 180 : 80,
        },
      ]}
    >
      {render()}
    </View>
  );
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
  },
  skeletonContainer: {
    marginTop: 10,
  },
});

export default observer(SearchResultView);
