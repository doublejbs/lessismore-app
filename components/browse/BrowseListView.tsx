import { FC, useCallback, useRef } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import Browse from '@/model/browse/Browse';
import BrowseSort from '@/model/search/BrowseSort';
import Bag from '@/model/bag/Bag';
import Gear from '@/model/gear/Gear';
import PretendardText from '../PretendardText';
import { Color } from '@/constants/DesignTokens';
import SearchGearView from '../search/SearchGearView';
import SearchSkeletonView from '../search/SearchSkeletonView';
import BrowseSortButtonView from './BrowseSortButtonView';
import app from '@/model/app/App';

interface Props {
  browse: Browse;
  bag: Bag;
  title: string;
}

const BrowseListView: FC<Props> = ({ browse, bag, title }) => {
  const router = useRouter();
  const result = browse.getResult();
  const sort = browse.getSort();
  const isLoading = browse.isLoading();
  const isEmpty = browse.isEmpty();
  const canLoadMore = browse.canLoadMore();

  // 최초 포커스는 Wrapper의 initialize()가 이미 로드하므로 스킵(중복 로드 방지).
  // 화면 복귀(재포커스) 시에만 보유 배지 동기화를 위해 reload한다.
  const isFirstFocus = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;

        return;
      }

      browse.reload();
    }, [browse])
  );

  const handleBack = () => {
    router.back();
  };

  const handleSelectSort = (value: BrowseSort) => {
    app.getAnalyticsManager()?.logClick('browse_sort', { sort: value });
    browse.changeSort(value);
  };

  const handleLoadMore = () => {
    browse.loadMore();
  };

  const renderItem = ({ item }: { item: Gear }) => (
    <View style={styles.itemContainer}>
      <SearchGearView gear={item} searchWarehouse={browse} bag={bag} />
    </View>
  );

  const renderContent = () => {
    if (isEmpty && !isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <PretendardText style={styles.emptyText}>
            장비가 없습니다
          </PretendardText>
        </View>
      );
    }

    return (
      <FlatList
        data={result}
        renderItem={renderItem}
        keyExtractor={(gear: Gear) => gear.getId()}
        onEndReached={canLoadMore ? handleLoadMore : null}
        onEndReachedThreshold={0.1}
        ListFooterComponent={
          isLoading ? (
            <View style={styles.skeletonContainer}>
              <SearchSkeletonView />
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name='chevron-back' size={24} color={Color.textPrimary} />
        </TouchableOpacity>
        <PretendardText style={styles.headerTitle} weight='bold'>
          {title}
        </PretendardText>
        <View style={styles.headerRight}>
          <BrowseSortButtonView sort={sort} onSelect={handleSelectSort} />
        </View>
      </View>
      <View style={styles.content}>{renderContent()}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Color.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 48,
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    color: Color.textPrimary,
  },
  headerRight: {
    marginLeft: 'auto',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  itemContainer: {
    width: '100%',
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 80,
  },
  skeletonContainer: {
    marginTop: 10,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    color: Color.textSecondary,
    textAlign: 'center',
  },
});

export default observer(BrowseListView);
