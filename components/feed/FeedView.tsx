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
import FeedSkeletonView from './FeedSkeletonView';
import FeedFilterBarView from './FeedFilterBarView';
import FeedRankingButtonView from './FeedRankingButtonView';
import FeedCardView from './FeedCardView';
import app from '@/model/app/App';

const END_REACHED_THRESHOLD = 0.3;

// FD-2: 2컬럼 그리드. 카드 사이 간격과 카드 아래 세로 간격.
const FEED_COLUMN_GAP = 12;
const FEED_ROW_GAP = 24;
const LIST_HORIZONTAL_PADDING = 20;

// 플로팅 필터 버튼(높이 ~48 + BOTTOM_OFFSET)이 마지막 카드를 가리지 않도록 리스트 하단 여백을 확보한다.
// iOS 오프셋 80 + 버튼 48 + 여유, Android 오프셋 20 + 버튼 48 + 여유.
const LIST_BOTTOM_PADDING = Platform.select({
  ios: 150,
  android: 120,
  default: 150,
});

const COUPANG_DISCLAIMER =
  '이 링크는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.';

interface Props {
  bag: Bag;
}

// FD-2/FD-4: 장비 피드 본체. Feed 도메인 객체를 1회 생성·초기화하고 카드 FlatList(2컬럼 그리드)로 렌더한다.
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
      // 각 셀을 flex 컨테이너로 감싸 절반 폭을 차지하게 하고, 마지막 홀수 카드가
      // 우측으로 늘어나지 않도록 셀 폭을 고정(좌측 정렬)한다.
      return (
        <View style={styles.cell}>
          <FeedCardView gear={item} actions={feed} bag={bag} />
        </View>
      );
    },
    [feed, bag]
  );

  const keyExtractor = useCallback((gear: Gear) => gear.getId(), []);

  const renderFooter = useCallback(() => {
    if (isEmpty) {
      return null;
    }

    return (
      <View style={styles.footer}>
        {isLoading ? (
          <ActivityIndicator size='small' color='#888' />
        ) : null}
        {items.length > 0 ? (
          <PretendardText style={styles.disclaimer}>
            {COUPANG_DISCLAIMER}
          </PretendardText>
        ) : null}
      </View>
    );
  }, [isLoading, isEmpty, items.length]);

  const renderEmpty = useCallback(() => {
    return (
      <View style={styles.emptyContainer}>
        <PretendardText style={styles.emptyText}>
          장비가 없습니다
        </PretendardText>
      </View>
    );
  }, []);

  // 최초 로딩(초기화 전 또는 데이터 없이 로딩 중)에는 2컬럼 스켈레톤으로 화면을 채운다.
  // isInitialized가 초기 렌더에서 false이므로, 로드가 빨라도 스켈레톤이 먼저 보인다.
  const showSkeleton = (!isInitialized || isLoading) && items.length === 0;

  if (showSkeleton) {
    return (
      <View style={styles.container}>
        <FeedFilterBarView feed={feed} />
        <View style={styles.skeletonContainer}>
          <FeedSkeletonView count={6} />
        </View>
        <FeedRankingButtonView feed={feed} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FeedFilterBarView feed={feed} />
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
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
      <FeedRankingButtonView feed={feed} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: LIST_HORIZONTAL_PADDING,
    paddingTop: 12,
    paddingBottom: LIST_BOTTOM_PADDING,
  },
  columnWrapper: {
    gap: FEED_COLUMN_GAP,
    marginBottom: FEED_ROW_GAP,
  },
  cell: {
    flex: 1,
    // 마지막 홀수 카드가 남는 폭 전체로 늘어나지 않도록 최대 절반으로 제한한다.
    maxWidth: '50%',
  },
  skeletonContainer: {
    flex: 1,
    paddingTop: 10,
    paddingHorizontal: LIST_HORIZONTAL_PADDING,
  },
  footer: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 16,
  },
  disclaimer: {
    fontSize: 11,
    color: '#B0B0B0',
    textAlign: 'center',
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
