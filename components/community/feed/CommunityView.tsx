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
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import Layout from '@/components/Layout';
import PretendardText from '@/components/PretendardText';
import CategoryChipView from '@/components/browse/CategoryChipView';
import FloatingPillButton from '@/components/FloatingPillButton';
import { Acg, AcgLayout, AcgType, Radius } from '@/constants/DesignTokens';
import CommunityFeed from '@/model/community-feed/CommunityFeed';
import CommunityFeedFilter from '@/model/community/CommunityFeedFilter';
import CommunityPost from '@/model/community/CommunityPost';
import CommunityFeedCardView from './CommunityFeedCardView';
import CommunityFeedSkeletonView from './CommunityFeedSkeletonView';
import app from '@/model/app/App';

interface Props {
  feed: CommunityFeed;
}

const IOS_EDGES = ['top', 'left', 'right'] as const;
const END_REACHED_THRESHOLD = 0.3;
const TAB_BAR_HEIGHT = 49;
const FLOATING_BUTTON_MARGIN = 20;
const FLOATING_BUTTON_HEIGHT = 48;
const LIST_BOTTOM_EXTRA = 12;

const CommunityView: FC<Props> = ({ feed }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isInitialLoadSettled, setIsInitialLoadSettled] = useState(false);
  const posts = feed.getPosts();
  const isLoading = feed.getIsLoading();
  const isRefreshing = feed.getIsRefreshing();
  const isLoadingMore = feed.getIsLoadingMore();
  const error = feed.getError();
  const writeButtonBottom = Platform.select({
    ios: insets.bottom + TAB_BAR_HEIGHT + FLOATING_BUTTON_MARGIN,
    android: FLOATING_BUTTON_MARGIN,
    default: FLOATING_BUTTON_MARGIN,
  });
  const listBottomPadding = Platform.select({
    ios:
      insets.bottom +
      TAB_BAR_HEIGHT +
      FLOATING_BUTTON_MARGIN +
      FLOATING_BUTTON_HEIGHT +
      LIST_BOTTOM_EXTRA,
    android: FLOATING_BUTTON_MARGIN + FLOATING_BUTTON_HEIGHT + LIST_BOTTOM_EXTRA,
    default: FLOATING_BUTTON_MARGIN + FLOATING_BUTTON_HEIGHT + LIST_BOTTOM_EXTRA,
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
    };
  }, [feed]);

  useEffect(() => {
    if (!error) {
      return;
    }

    console.error('커뮤니티 피드 조회 실패:', error); // l10n-ignore: 개발자 로그
    app.getToastManager()?.show({
      message: app.getL10n().t('community.feed.loadFailed'),
    });
  }, [error]);

  const handleWrite = () => {
    if (!app.getFirebase().isLoggedIn()) {
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
        | 'community.type.question'
        | 'community.type.bagReview'
        | 'community.type.poll';
    }[] = [
      { filter: CommunityFeedFilter.All, labelKey: 'community.type.all' },
      {
        filter: CommunityFeedFilter.Question,
        labelKey: 'community.type.question',
      },
      {
        filter: CommunityFeedFilter.BagReview,
        labelKey: 'community.type.bagReview',
      },
      { filter: CommunityFeedFilter.Poll, labelKey: 'community.type.poll' },
    ];

    return (
      <ScrollView
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
      </ScrollView>
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
    (!isInitialLoadSettled || isLoading) && posts.length === 0;

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
  title: {
    paddingHorizontal: AcgLayout.screenPadding,
    ...AcgType.screenTitle,
    color: Acg.ink,
  },
  filterContent: {
    gap: AcgLayout.chipGap,
    paddingHorizontal: AcgLayout.screenPadding,
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
    right: AcgLayout.screenPadding,
  },
});

export default observer(CommunityView);
