import React, { FC, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  View,
  Text,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import ExploreWarehouse from '@/model/explore/ExploreWarehouse';
import ExploreFilterView from './ExploreFilterView';
import ExploreSortView from './ExploreSortView';
import ExploreGearView from './ExploreGearView';
import Bag from '@/model/bag/Bag';
import { useFocusEffect } from 'expo-router';
import SearchSkeletonView from '@/components/search/SearchSkeletonView';

interface Props {
  exploreWarehouse: ExploreWarehouse;
  bag: Bag;
}

const ExploreView: FC<Props> = ({ exploreWarehouse, bag }) => {
  const gears = exploreWarehouse.getGears();
  const isLoading = exploreWarehouse.isLoading();
  const isLoadingMore = exploreWarehouse.isLoadingMore();

  useFocusEffect(
    useCallback(() => {
      exploreWarehouse.load();
    }, [])
  );

  const handleLoadMore = () => {
    if (!isLoadingMore && !isLoading) {
      exploreWarehouse.loadMore();
    }
  };

  const renderFooter = () => {
    if (!isLoadingMore) return <View style={styles.footerSpacer} />;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size='small' color='#000' />
      </View>
    );
  };

  const renderEmpty = () => {
    if (isLoading) return <SearchSkeletonView count={6} />;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>조건에 맞는 장비가 없습니다</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        <ExploreFilterView exploreWarehouse={exploreWarehouse} />
        <ExploreSortView exploreWarehouse={exploreWarehouse} />
      </View>

      <FlatList
        data={gears}
        renderItem={({ item }) => (
          <View style={styles.itemContainer}>
            <ExploreGearView
              gear={item}
              exploreWarehouse={exploreWarehouse}
              bag={bag}
            />
          </View>
        )}
        keyExtractor={item => item.getId()}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  filterContainer: {
    paddingTop: 12,
    backgroundColor: '#FFF',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  itemContainer: {
    marginBottom: 20,
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerSpacer: {
    height: 20,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Pretendard-Regular',
    color: '#999',
  },
});

export default observer(ExploreView);
