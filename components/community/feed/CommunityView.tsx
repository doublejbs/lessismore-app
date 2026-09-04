import { FC, useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItemInfo,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import Layout from '@/components/Layout';
import PretendardText from '@/components/PretendardText';
import CategoryChipView from '@/components/browse/CategoryChipView';
import OrderButtonView from '@/components/order/OrderButtonView';
import FloatingPillButton from '@/components/FloatingPillButton';
import { Acg, AcgLayout, AcgType, Radius } from '@/constants/DesignTokens';
import {
  FLOATING_ACTION_RIGHT,
  getFloatingActionBottom,
  getFloatingActionListBottomPadding,
} from '@/constants/FloatingAction';
import CommunityFeed from '@/model/community-feed/CommunityFeed';
import CommunityFeedFilter from '@/model/community/CommunityFeedFilter';
import CommunityFeedSort from '@/model/community/CommunityFeedSort';
import CommunityPost from '@/model/community/CommunityPost';
import OrderOption from '@/model/order/OrderOption';
import OrderType from '@/model/order/OrderType';
import CommunityFeedCardView from './CommunityFeedCardView';
import CommunityFeedSkeletonView from './CommunityFeedSkeletonView';
import app from '@/model/app/App';

interface Props {
  feed: CommunityFeed;
}

const IOS_EDGES = ['top', 'left', 'right'] as const;
const END_REACHED_THRESHOLD = 0.3;
const CommunityView: FC<Props> = ({ feed }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userId = app.getFirebase().getUserId();
  const isLoggedIn = Boolean(userId);
  const [pendingWrite, setPendingWrite] = useState(false);
  const posts = feed.getPosts();
  const isLoading = feed.getIsLoading();
  const isRefreshing = feed.getIsRefreshing();
  const isLoadingMore = feed.getIsLoadingMore();
  const error = feed.getError();
  const writeButtonBottom = getFloatingActionBottom(insets.bottom);
  const listBottomPadding = getFloatingActionListBottomPadding(insets.bottom);

  useFocusEffect(
    useCallback(() => {
      if (feed.getIsInitialized()) {
        void feed.refresh(true);
      }
    }, [feed])
  );

  useEffect(() => {
    if (!error) {
      return;
    }

    console.error('커뮤니티 피드 조회 실패:', error); // l10n-ignore: 개발자 로그
  }, [error]);

  useEffect(() => {
    if (!pendingWrite || !isLoggedIn) {
      return;
    }

    const timer = setTimeout(() => {
      setPendingWrite(false);
      router.push('/community-write-options');
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, [isLoggedIn, pendingWrite, router]);

  const handleWrite = () => {
    if (!app.getFirebase().isLoggedIn()) {
      setPendingWrite(true);
      app.getLogInAlertManager()?.show();

      return;
    }

    app.getAnalyticsManager()?.logClick('click_community_write');
    router.push('/community-write-options');
  };

  const handleFilter = useCallback(
    (filter: CommunityFeedFilter) => {
      void feed.setFilter(filter);
    },
    [feed]
  );

  const handleSort = useCallback(
    (option: OrderOption) => {
      const sort =
        option.getOrder() === OrderType.Popular
          ? CommunityFeedSort.Popular
          : CommunityFeedSort.Latest;

      void feed.setSort(sort);
    },
    [feed]
  );

  const handleMyPosts = useCallback(() => {
    app.getAnalyticsManager()?.logClick('click_community_my_posts');
    router.push('/community/mine');
  }, [router]);

  const handleRefresh = useCallback(() => {
    void feed.refresh();
  }, [feed]);

  const handleEndReached = useCallback(() => {
    void feed.loadMore();
  }, [feed]);

  const renderFilterBar = () => {
    const filters: {
      filter: CommunityFeedFilter;
      labelKey:
        | 'community.type.all'
        | 'community.type.post'
        | 'community.type.bagReview'
        | 'community.type.poll';
    }[] = [
      { filter: CommunityFeedFilter.All, labelKey: 'community.type.all' },
      {
        filter: CommunityFeedFilter.Post,
        labelKey: 'community.type.post',
      },
      {
        filter: CommunityFeedFilter.BagReview,
        labelKey: 'community.type.bagReview',
      },
      { filter: CommunityFeedFilter.Poll, labelKey: 'community.type.poll' },
    ];

    return (
      <View style={styles.filterRow}>
        <ScrollView
          style={styles.filterScroll}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          {filters.map(item => (
            <CategoryChipView
              key={item.filter}
              label={app.getL10n().t(item.labelKey)}
              selected={feed.getFilter() === item.filter}
              onPress={() => handleFilter(item.filter)}
            />
          ))}
          {isLoggedIn && (
            <CategoryChipView
              label={app.getL10n().t('community.myPosts.title')}
              selected={false}
              onPress={handleMyPosts}
              accessibilityLabel={app.getL10n().t('community.myPosts.title')}
              trailingIcon={
                <Ionicons
                  name='chevron-forward'
                  size={14}
                  color={Acg.textSecondary}
                />
              }
            />
          )}
        </ScrollView>
        <OrderButtonView
          order={feed.getOrder()}
          onSelectOption={handleSort}
        />
      </View>
    );
  };

  const renderEmpty = () => {
    if (error) {
      return (
        <View style={styles.errorContainer}>
          <PretendardText style={styles.emptyTitle} weight='semibold'>
            {app.getL10n().t('community.feed.loadFailed')}
          </PretendardText>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRefresh}
            accessibilityRole='button'
            accessibilityLabel={app.getL10n().t('community.feed.retry')}
          >
            <PretendardText style={styles.retryText} weight='semibold'>
              {app.getL10n().t('community.feed.retry')}
            </PretendardText>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <PretendardText style={styles.emptyTitle} weight='semibold'>
          {app.getL10n().t('community.feed.empty')}
        </PretendardText>
        <PretendardText style={styles.emptyHint}>
          {app.getL10n().t('community.feed.emptyHint')}
        </PretendardText>
      </View>
    );
  };

  const renderFooter = () => {
    if (error && posts.length > 0) {
      return (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={handleRefresh}
          accessibilityRole='button'
          accessibilityLabel={app.getL10n().t('community.feed.retry')}
        >
          <PretendardText style={styles.retryText} weight='semibold'>
            {app.getL10n().t('community.feed.retry')}
          </PretendardText>
        </TouchableOpacity>
      );
    }

    if (isLoadingMore) {
      return (
        <View style={styles.footerLoading}>
          <ActivityIndicator size='small' color={Acg.textMuted} />
        </View>
      );
    }

    return <View style={styles.footerSpace} />;
  };

  const renderItem = ({ item }: ListRenderItemInfo<CommunityPost>) => {
    return <CommunityFeedCardView post={item} />;
  };

  const showSkeleton =
    (!feed.getIsInitialized() || isLoading) && posts.length === 0;

  return (
    <Layout
      edges={Platform.OS === 'ios' ? IOS_EDGES : undefined}
      paddingHorizontal={0}
    >
      <View style={styles.header}>
        <PretendardText weight='semibold' style={styles.title}>
          {app.getL10n().t('community.title')}
        </PretendardText>
        {renderFilterBar()}
      </View>
      {showSkeleton ? (
        <ScrollView
          contentContainerStyle={[
            styles.skeletonContent,
            { paddingBottom: listBottomPadding },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {[0, 1, 2, 3].map(index => (
            <CommunityFeedSkeletonView key={index} />
          ))}
        </ScrollView>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderItem}
          keyExtractor={item => item.getId()}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: listBottomPadding },
          ]}
          showsVerticalScrollIndicator={false}
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
      )}
      {!showSkeleton && (
        <FloatingPillButton
          label={app.getL10n().t('community.feed.writeButton')}
          onPress={handleWrite}
          variant='primary'
          style={[styles.writeButton, { bottom: writeButtonBottom }]}
        />
      )}
    </Layout>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingTop: 12,
    paddingBottom: 8,
    gap: 12,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: AcgLayout.screenPadding,
    paddingRight: 12,
  },
  filterScroll: {
    flex: 1,
  },
  title: {
    paddingHorizontal: AcgLayout.screenPadding,
    ...AcgType.screenTitle,
    color: Acg.ink,
  },
  filterContent: {
    gap: AcgLayout.chipGap,
    paddingRight: AcgLayout.chipGap,
  },
  listContent: {
    flexGrow: 1,
    gap: 12,
    paddingHorizontal: AcgLayout.screenPadding,
    paddingTop: 8,
  },
  skeletonContent: {
    gap: 12,
    paddingHorizontal: AcgLayout.screenPadding,
    paddingTop: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 120,
  },
  emptyTitle: {
    ...AcgType.sectionTitle,
    color: Acg.ink,
    textAlign: 'center',
  },
  emptyHint: {
    ...AcgType.body,
    color: Acg.textSecondary,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 120,
  },
  footerLoading: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerSpace: {
    height: 8,
  },
  retryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    marginVertical: 12,
    paddingHorizontal: 16,
    borderRadius: Radius.pill,
    backgroundColor: Acg.controlFill,
  },
  retryText: {
    ...AcgType.control,
    color: Acg.ink,
  },
  writeButton: {
    position: 'absolute',
    right: FLOATING_ACTION_RIGHT,
  },
});

export default observer(CommunityView);
