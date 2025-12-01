import { FC, useCallback } from 'react';
import { FlatList, View } from 'react-native';
import SearchGearView from './SearchGearView';
import Gear from '@/model/gear/Gear';
import SearchSkeletonView from './SearchSkeletonView';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import { observer } from 'mobx-react-lite';
import { StyleSheet } from 'react-native';
import Bag from '@/model/bag/Bag';
import { useFocusEffect } from 'expo-router';

interface Props {
  result: Gear[];
  canLoadMore: boolean;
  handleLoadMore: () => void;
  searchWarehouse: SearchWarehouse;
  bag: Bag;
  children?: React.ReactNode;
}

const SearchResultContentView: FC<Props> = ({
  result,
  canLoadMore,
  handleLoadMore,
  searchWarehouse,
  children,
  bag,
}) => {
  const isLoading = searchWarehouse.isLoading();

  useFocusEffect(
    useCallback(() => {
      searchWarehouse.executeSearch();
    }, [searchWarehouse])
  );

  return (
    <FlatList
      data={result}
      renderItem={({ item: gear }) => (
        <View style={styles.itemContainer}>
          <SearchGearView
            gear={gear}
            searchWarehouse={searchWarehouse}
            bag={bag}
          />
        </View>
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
};

const styles = StyleSheet.create({
  itemContainer: {
    width: '100%',
  },
  flatListContent: {
    flexGrow: 1,
    paddingBottom: 150,
  },
  skeletonContainer: {
    marginTop: 10,
  },
});

export default observer(SearchResultContentView);
