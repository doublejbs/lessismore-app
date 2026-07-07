import { FC, useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  ListRenderItemInfo,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import Feed from '@/model/feed/Feed';
import Gear from '@/model/gear/Gear';
import Bag from '@/model/bag/Bag';
import PretendardText from '@/components/PretendardText';
import SearchSkeletonView from '@/components/search/SearchSkeletonView';
import FeedFilterBarView from './FeedFilterBarView';
import FeedCardView from './FeedCardView';
import app from '@/model/app/App';

const END_REACHED_THRESHOLD = 0.3;

interface Props {
  bag: Bag;
}

// FD-2/FD-4: 장비 피드 본체. Feed 도메인 객체를 1회 생성·초기화하고 카드 FlatList로 렌더한다.
// 필터 바는 FlatList 밖 상단에 고정해 스크롤과 무관하게 항상 접근 가능하게 한다.
const FeedView: FC<Props> = ({ bag }) => {
  const router = useRouter();
  const [feed] = useState(() => Feed.new(router));

  useEffect(() => {
    feed.initialize();

    return () => {
      feed.dispose();
    };
  }, [feed]);

  const items = feed.getItems();
  const isInitialized = feed.isInitialized();
  const isLoading = feed.isLoading();
  const isRefreshing = feed.isRefreshing();
  const isEmpty = feed.isEmpty();

  const handleEndReached = () => {
    feed.loadMore();
  };

  const handleRefresh = () => {
    app.getAnalyticsManager()?.logClick('feed_refresh');
    feed.refresh();
  };

  const renderItem = ({ item }: ListRenderItemInfo<Gear>) => {
    return <FeedCardView gear={item} actions={feed} bag={bag} />;
  };

  const renderFooter = () => {
    if (!isLoading || isEmpty) {
      return null;
    }

    return (
      <View style={styles.footer}>
        <ActivityIndicator size='small' color='#888' />
      </View>
    );
  };

  const renderEmpty = () => {
    if (!isInitialized || isLoading) {
      return (
        <View style={styles.skeletonContainer}>
          <SearchSkeletonView count={5} />
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <PretendardText style={styles.emptyText}>
          장비가 없습니다
        </PretendardText>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FeedFilterBarView feed={feed} />
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(gear: Gear) => gear.getId()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        onEndReached={handleEndReached}
        onEndReachedThreshold={END_REACHED_THRESHOLD}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor='#888'
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  skeletonContainer: {
    paddingTop: 10,
  },
  footer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 120,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },
});

export default observer(FeedView);
