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
import { Liquid, LiquidLayout } from '@/constants/DesignTokens';
import FeedSkeletonView from './FeedSkeletonView';
import FeedFilterBarView from './FeedFilterBarView';
import FeedRankingButtonView from './FeedRankingButtonView';
import FeedCardView from './FeedCardView';
import app from '@/model/app/App';

const END_REACHED_THRESHOLD = 0.3;

// FD-2: 2컬럼 그리드. 카드 사이 간격과 카드 아래 세로 간격.
const FEED_COLUMN_GAP = 12;
const FEED_ROW_GAP = 14;
const LIST_HORIZONTAL_PADDING = LiquidLayout.screenH;

// 쿠팡 링크가 **실제로 노출된 카드가 있을 때만** 리스트 푸터에서 1회 고지한다(FD-2).
// 링크가 하나도 없는 목록에까지 문구를 띄우지 않는다.
const COUPANG_DISCLAIMER =
  '쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.';

interface Props {
  bag: Bag;
  // 탐색 탭이 검색 승계(FD-3)를 위해 상위에서 소유·공유하는 피드. 없으면 내부에서 생성한다.
  feed?: Feed;
  // GE-8: 장비 추가 검색 진입 시 담기 동작 컨텍스트(카드로 전달).
  gearAddContext?: GearAddContext | undefined;
}

// FD-2/FD-4: 장비 피드 본체. Feed 도메인 객체를 1회 생성·초기화하고 카드 FlatList(2컬럼 그리드)로 렌더한다.
// FD-3: 상단 필터 바 대신, FlatList 위에 하단 플로팅 버튼(필터·인기 순위)을 absolute로 얹는다.
const FeedView: FC<Props> = ({ bag, feed: externalFeed, gearAddContext }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [feed] = useState(() => externalFeed ?? Feed.new(router));
  const ownsFeed = !externalFeed;
  /**
   * 이 화면에서 쿠팡 링크가 붙은 카드를 한 번이라도 봤는지.
   *
   * **한 번 켜지면 되돌리지 않는다.** 필터를 바꿔 링크 없는 목록이 와도 고지가 남는데, 그쪽이
   * 안전하다 — 이미 제휴 링크를 노출한 화면이고, 추가 로드(페이지네이션)마다 초기화하면 이미
   * 마운트된 카드가 다시 알려주지 않아 고지가 사라진다.
   */
  const [hasCoupangLink, setHasCoupangLink] = useState(false);

  // 카드 로드 effect의 의존성이라 참조를 고정한다(FeedCardView의 prop 주석 참고).
  const handleCoupangLinkLoaded = useCallback(() => {
    setHasCoupangLink(true);
  }, []);

  // 플로팅 탭바·`인기 순위` 버튼 아래로 콘텐츠가 흐르므로 시안대로 130을 비운다
  // (검색 결과 그리드와 같은 값 — 같은 카드가 두 화면에서 다른 높이에 끊기면 안 된다).
  // iOS는 edge-to-edge라 탭바 영역(insets.bottom)까지 더한다. Android는 커스텀 탭이라 고정값.
  const listBottomPadding = Platform.select({
    ios: insets.bottom + LiquidLayout.scrollBottom,
    default: LiquidLayout.scrollBottom,
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
      // 각 셀을 flex 컨테이너로 감싸 절반 폭을 차지하게 하고, 마지막 홀수 카드가
      // 우측으로 늘어나지 않도록 셀 폭을 고정(좌측 정렬)한다.
      return (
        <View style={styles.cell}>
          <FeedCardView
            gear={item}
            actions={feed}
            bag={bag}
            gearAddContext={gearAddContext}
            onCoupangLinkLoaded={handleCoupangLinkLoaded}
          />
        </View>
      );
    },
    [feed, bag, gearAddContext, handleCoupangLinkLoaded]
  );

  const keyExtractor = useCallback((gear: Gear) => gear.getId(), []);

  const renderFooter = useCallback(() => {
    if (isEmpty) {
      return null;
    }

    return (
      <View style={styles.footer}>
        {isLoading ? (
          <ActivityIndicator size='small' color={Liquid.inkMuted} />
        ) : null}
        {hasCoupangLink ? (
          <PretendardText style={styles.disclaimer}>
            {COUPANG_DISCLAIMER}
          </PretendardText>
        ) : null}
      </View>
    );
  }, [isLoading, isEmpty, hasCoupangLink]);

  const renderEmpty = useCallback(() => {
    return (
      <View style={styles.emptyContainer}>
        <PretendardText weight='semibold' style={styles.emptyTitle}>
          조건에 맞는 장비가 없어요
        </PretendardText>
        <PretendardText style={styles.emptyText}>
          필터를 하나 풀어보면 어떨까요?
        </PretendardText>
      </View>
    );
  }, []);

  // 최초 로딩(초기화 전 또는 데이터 없이 로딩 중)에는 2컬럼 스켈레톤으로 화면을 채운다.
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
          <FeedSkeletonView count={6} />
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
            tintColor={Liquid.inkMuted}
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
    paddingHorizontal: LIST_HORIZONTAL_PADDING,
    // 필터 줄과 그리드 사이 — 목업 기준 16.
    paddingTop: 16,
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
    // 로드 완료 상태(listContent)와 동일한 상단 여백으로 전환 시 점프를 없앤다.
    paddingTop: 16,
    paddingHorizontal: LIST_HORIZONTAL_PADDING,
  },
  footer: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 16,
  },
  disclaimer: {
    fontSize: 11,
    lineHeight: 16,
    color: Liquid.inkSubtle,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 120,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 17,
    lineHeight: 24,
    color: Liquid.ink,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 20,
    color: Liquid.inkTertiary,
    textAlign: 'center',
  },
});

export default observer(FeedView);
