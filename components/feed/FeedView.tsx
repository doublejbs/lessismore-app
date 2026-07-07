import { FC, useCallback, useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  ListRenderItemInfo,
  Platform,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import Feed from '@/model/feed/Feed';
import Gear from '@/model/gear/Gear';
import Bag from '@/model/bag/Bag';
import PretendardText from '@/components/PretendardText';
import SearchSkeletonView from '@/components/search/SearchSkeletonView';
import FeedFilterButtonView from './FeedFilterButtonView';
import FeedCardView from './FeedCardView';
import app from '@/model/app/App';

const END_REACHED_THRESHOLD = 0.3;

// 플로팅 필터 버튼(높이 ~48 + BOTTOM_OFFSET)이 마지막 카드를 가리지 않도록 리스트 하단 여백을 확보한다.
// iOS 오프셋 80 + 버튼 48 + 여유, Android 오프셋 20 + 버튼 48 + 여유.
const LIST_BOTTOM_PADDING = Platform.select({
  ios: 150,
  android: 120,
  default: 150,
});

interface Props {
  bag: Bag;
}

// FD-2/FD-4: 장비 피드 본체. Feed 도메인 객체를 1회 생성·초기화하고 카드 FlatList로 렌더한다.
// FD-3: 상단 필터 바 대신, FlatList 위에 하단 플로팅 버튼(필터·인기 순위)을 absolute로 얹는다.
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

  const handleEndReached = useCallback(() => {
    feed.loadMore();
  }, [feed]);

  const handleRefresh = useCallback(() => {
    app.getAnalyticsManager()?.logClick('feed_refresh');
    feed.refresh();
  }, [feed]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Gear>) => {
      return <FeedCardView gear={item} actions={feed} bag={bag} />;
    },
    [feed, bag]
  );

  const keyExtractor = useCallback((gear: Gear) => gear.getId(), []);

  const renderFooter = useCallback(() => {
    if (!isLoading || isEmpty) {
      return null;
    }

    return (
      <View style={styles.footer}>
        <ActivityIndicator size='small' color='#888' />
      </View>
    );
  }, [isLoading, isEmpty]);

  const renderEmpty = useCallback(() => {
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
  }, [isInitialized, isLoading]);

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
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
      <FeedFilterButtonView feed={feed} />
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
    paddingBottom: LIST_BOTTOM_PADDING,
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
