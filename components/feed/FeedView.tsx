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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Feed from '@/model/feed/Feed';
import Gear from '@/model/gear/Gear';
import Bag from '@/model/bag/Bag';
import { GearAddContext } from '@/model/gear/GearAddContext';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgType } from '@/constants/DesignTokens';
import FeedSkeletonView from './FeedSkeletonView';
import FeedFilterBarView from './FeedFilterBarView';
import FeedRankingSectionView from './FeedRankingSectionView';
import useFeedRankingSectionState from './useFeedRankingSectionState';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import FeedGridCellView from './FeedGridCellView';
import app from '@/model/app/App';

const END_REACHED_THRESHOLD = 0.3;

// FD-2: 단일 컬럼 목록(레퍼런스 이식). 행 사이 여백 24, 화면 좌우 여백 16.
const FEED_ROW_GAP = 24;

// 열 사이 간격. 셀 안 텍스트가 이웃 셀과 붙어 읽히지 않을 만큼만 둔다.
const FEED_COLUMN_GAP = 16;

interface Props {
  bag: Bag;
  // FD-6: 피드 상단 인기 순위 섹션이 쓰는 순위 모델(`getSearchRank()`)의 소유자. 탐색 탭 수준에서 생성된다.
  searchWarehouse: SearchWarehouse;
  // 탐색 탭이 검색 승계(FD-3)를 위해 상위에서 소유·공유하는 피드. 없으면 내부에서 생성한다.
  feed?: Feed;
  // GE-8: 장비 추가 검색 진입 시 담기 동작 컨텍스트(행으로 전달).
  gearAddContext?: GearAddContext | undefined;
}

// FD-2/FD-4: 장비 피드 본체. Feed 도메인 객체를 1회 생성·초기화하고 단일 컬럼 FlatList로 렌더한다.
// 목록에는 면·테두리·그림자·구분선이 없다 — 순백 지면에 행이 직접 놓인다(레퍼런스).
// FD-3: 상단 필터 바(칩 행 + 정렬 줄) 아래로 목록이 흐른다.
// FD-6: 목록 머리(ListHeaderComponent)에 인기 순위 섹션을 둔다(구 플로팅 `인기 순위` 버튼 대체).
const FeedView: FC<Props> = ({
  bag,
  searchWarehouse,
  feed: externalFeed,
  gearAddContext,
}) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [feed] = useState(() => externalFeed ?? Feed.new(router));
  const [isInitialLoadSettled, setIsInitialLoadSettled] = useState(false);
  const ownsFeed = !externalFeed;
  // 플로팅 탭바가 마지막 행을 가리지 않도록 리스트 하단 여백을 확보한다(홈과 같은 기준).
  // FD-6으로 플로팅 `인기 순위` 버튼이 사라져 버튼 몫을 따로 두지 않고 홈과 같은 `AcgLayout.scrollBottom`으로 통일한다.
  const listBottomPadding = Platform.select({
    ios: insets.bottom + AcgLayout.scrollBottom,
    android: AcgLayout.scrollBottom,
    default: AcgLayout.scrollBottom,
  });

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      await feed.initialize();

      if (isMounted) {
        setIsInitialLoadSettled(true);
      }
    };

    void initialize();

    return () => {
      isMounted = false;

      // 외부 소유 피드는 언마운트(검색어 입력) 시에도 상태를 유지해야 하므로 소유자만 dispose한다.
      if (ownsFeed) {
        feed.dispose();
      }
    };
  }, [feed, ownsFeed]);

  const items = feed.getItems();
  const isInitialized = feed.isInitialized();
  const isLoading = feed.isLoading();
  const isRefreshing = feed.isRefreshing();
  const isEmpty = feed.isEmpty();
  const ranking = useFeedRankingSectionState({
    feed,
    searchWarehouse,
    gearAddContext,
  });

  const handleEndReached = useCallback(() => {
    feed.loadMore();
  }, [feed]);

  const handleRefresh = useCallback(() => {
    app.getAnalyticsManager()?.logClick('feed_refresh');
    feed.refresh();
  }, [feed]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Gear>) => {
      return (
        <FeedGridCellView
          gear={item}
          actions={feed}
          bag={bag}
          gearAddContext={gearAddContext}
        />
      );
    },
    [feed, bag, gearAddContext]
  );

  const keyExtractor = useCallback((gear: Gear) => gear.getId(), []);

  const renderFooter = useCallback(() => {
    if (isEmpty) {
      return null;
    }

    return (
      <View style={styles.footer}>
        {isLoading ? (
          <ActivityIndicator size='small' color={Acg.textMuted} />
        ) : null}
      </View>
    );
  }, [isLoading, isEmpty]);

  const renderEmpty = useCallback(() => {
    return (
      <View style={styles.emptyContainer}>
        <PretendardText style={styles.emptyText}>
          {app.getL10n().t('feed.empty')}
        </PretendardText>
      </View>
    );
  }, []);

  // 최초 로딩(초기화 전 또는 데이터 없이 로딩 중)에는 행 골격 스켈레톤으로 화면을 채운다.
  // isInitialized가 초기 렌더에서 false이므로, 로드가 빨라도 스켈레톤이 먼저 보인다.
  const showSkeleton =
    (!isInitialLoadSettled || !isInitialized || isLoading) && items.length === 0;

  // FD-6: 순위 로드는 피드 로드와 병렬이고 서로 기다리지 않는다 — 섹션은 자기 로딩 상태를 그린다.
  const rankingSection = ranking.isVisible ? (
    <FeedRankingSectionView
      feed={feed}
      bag={bag}
      searchRank={ranking.searchRank}
      category={ranking.category}
      gears={ranking.gears}
      isRankingLoading={ranking.isRankingLoading}
      rankingCount={ranking.rankingCount}
    />
  ) : null;

  if (showSkeleton) {
    // FD-6: 최초 스켈레톤 중에도 순위 섹션을 같은 자리에 그려 둘이 한 덩어리로 뜨게 한다.
    return (
      <View style={styles.container}>
        <FeedFilterBarView feed={feed} />
        <View style={styles.skeletonContainer}>
          {rankingSection}
          <FeedSkeletonView count={5} />
        </View>
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
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: listBottomPadding },
        ]}
        onEndReached={handleEndReached}
        onEndReachedThreshold={END_REACHED_THRESHOLD}
        ListHeaderComponent={rankingSection}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Acg.textMuted}
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
    paddingHorizontal: AcgLayout.screenPadding,
    paddingTop: 8,
  },
  // 열 사이 여백 + 행 사이 여백. 구분선은 두지 않는다 — 목록에 선을 두지 않는다(레퍼런스).
  columnWrapper: {
    gap: FEED_COLUMN_GAP,
    marginBottom: FEED_ROW_GAP,
  },
  skeletonContainer: {
    flex: 1,
    // 로드 완료 상태(listContent)와 동일한 상단 여백으로 전환 시 점프를 없앤다.
    paddingTop: 8,
    paddingHorizontal: AcgLayout.screenPadding,
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
    ...AcgType.control,
    color: Acg.textMuted,
    textAlign: 'center',
  },
});

export default observer(FeedView);
