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
import { Acg, AcgFontSize, AcgLayout } from '@/constants/DesignTokens';
import FeedSkeletonView from './FeedSkeletonView';
import FeedFilterBarView from './FeedFilterBarView';
import FeedRankingButtonView from './FeedRankingButtonView';
import FeedGridCellView from './FeedGridCellView';
import app from '@/model/app/App';

const END_REACHED_THRESHOLD = 0.3;

// FD-2: 단일 컬럼 목록(레퍼런스 이식). 행 사이 여백 24, 화면 좌우 여백 16.
const FEED_ROW_GAP = 24;

// 열 사이 간격. 셀 안 텍스트가 이웃 셀과 붙어 읽히지 않을 만큼만 둔다.
const FEED_COLUMN_GAP = 16;

interface Props {
  bag: Bag;
  // 탐색 탭이 검색 승계(FD-3)를 위해 상위에서 소유·공유하는 피드. 없으면 내부에서 생성한다.
  feed?: Feed;
  // GE-8: 장비 추가 검색 진입 시 담기 동작 컨텍스트(행으로 전달).
  gearAddContext?: GearAddContext | undefined;
}

// FD-2/FD-4: 장비 피드 본체. Feed 도메인 객체를 1회 생성·초기화하고 단일 컬럼 FlatList로 렌더한다.
// 목록에는 면·테두리·그림자·구분선이 없다 — 순백 지면에 행이 직접 놓인다(레퍼런스).
// FD-3: 상단 필터 바(칩 행 + 정렬 줄) 아래로 목록이 흐르고, 하단 플로팅 `인기 순위` 버튼을 absolute로 얹는다.
const FeedView: FC<Props> = ({ bag, feed: externalFeed, gearAddContext }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [feed] = useState(() => externalFeed ?? Feed.new(router));
  const ownsFeed = !externalFeed;
  // 플로팅 `인기 순위` 버튼(탭바 위 20pt, 높이 ~48)이 마지막 행을 가리지 않도록 리스트 하단 여백을 확보한다.
  // iOS는 edge-to-edge라 탭바 영역(insets.bottom)까지 더한다. Android는 커스텀 탭이라 고정값.
  const listBottomPadding = Platform.select({
    ios: insets.bottom + 90,
    android: 120,
    default: 150,
  });

  useEffect(() => {
    feed.initialize();

    return () => {
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
        <PretendardText style={styles.emptyText}>장비가 없어요</PretendardText>
      </View>
    );
  }, []);

  // 최초 로딩(초기화 전 또는 데이터 없이 로딩 중)에는 행 골격 스켈레톤으로 화면을 채운다.
  // isInitialized가 초기 렌더에서 false이므로, 로드가 빨라도 스켈레톤이 먼저 보인다.
  const showSkeleton = (!isInitialized || isLoading) && items.length === 0;

  if (showSkeleton) {
    // 플로팅 `인기 순위` 버튼은 스켈레톤 위에 띄우지 않는다. 탭이 막 마운트된 첫 프레임에는
    // 네이티브 탭바 몫이 반영되기 전이라 insets.bottom이 작게 잡혀 버튼이 탭바 뒤로 내려간다.
    // 피드가 로드된 뒤(= inset 정착 후)에만 노출하면 위치가 정확하고, 로딩 위 CTA 겹침도 없다.
    return (
      <View style={styles.container}>
        <FeedFilterBarView feed={feed} />
        <View style={styles.skeletonContainer}>
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
      {!gearAddContext && <FeedRankingButtonView feed={feed} />}
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
    fontSize: AcgFontSize.control,
    color: Acg.textMuted,
    textAlign: 'center',
  },
});

export default observer(FeedView);
