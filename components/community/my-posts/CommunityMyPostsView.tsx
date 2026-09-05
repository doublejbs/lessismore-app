import { FC, useCallback, useEffect } from 'react';
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
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import AlertView from '@/components/alert/AlertView';
import LogInView from '@/components/login/LogInView';
import ToastView from '@/components/toast/ToastView';
import CommunityFeedCardView from '@/components/community/feed/CommunityFeedCardView';
import CommunityFeedSkeletonView from '@/components/community/feed/CommunityFeedSkeletonView';
import {
  Acg,
  AcgLayout,
  AcgType,
  Radius,
} from '@/constants/DesignTokens';
import {
  getFloatingActionListBottomPadding,
} from '@/constants/FloatingAction';
import CommunityMyPosts from '@/model/community-my-posts/CommunityMyPosts';
import CommunityPost from '@/model/community/CommunityPost';
import app from '@/model/app/App';

interface Props {
  myPosts: CommunityMyPosts;
}

const END_REACHED_THRESHOLD = 0.3;
const NATIVE_HEADER_HEIGHT = 44;
const IS_IOS = Platform.OS === 'ios';

const CommunityMyPostsView: FC<Props> = ({ myPosts }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const l10n = app.getL10n();
  const posts = myPosts.getPosts();
  const isLoading = myPosts.getIsLoading();
  const isRefreshing = myPosts.getIsRefreshing();
  const isLoadingMore = myPosts.getIsLoadingMore();
  const error = myPosts.getError();
  const listBottomPadding = getFloatingActionListBottomPadding(insets.bottom);
  const title = l10n.t('community.myPosts.title');

  useFocusEffect(
    useCallback(() => {
      if (myPosts.getIsInitialized()) {
        void myPosts.refresh(true);
      }
    }, [myPosts])
  );

  useEffect(() => {
    if (!error) {
      return;
    }

    console.error('내가 쓴 글 조회 실패:', error); // l10n-ignore: 개발자 로그
  }, [error]);

  const handleWrite = () => {
    app.getAnalyticsManager()?.logClick('click_community_write');
    router.push('/community/write');
  };

  const handleRefresh = useCallback(() => {
    void myPosts.refresh();
  }, [myPosts]);

  const handleEndReached = useCallback(() => {
    void myPosts.loadMore();
  }, [myPosts]);

  const renderEmpty = () => {
    if (error) {
      return (
        <View style={styles.errorContainer}>
          <PretendardText style={styles.emptyTitle} weight='semibold'>
            {l10n.t('community.feed.loadFailed')}
          </PretendardText>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRefresh}
            accessibilityRole='button'
            accessibilityLabel={l10n.t('community.feed.retry')}
          >
            <PretendardText style={styles.retryText} weight='semibold'>
              {l10n.t('community.feed.retry')}
            </PretendardText>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <PretendardText style={styles.emptyTitle} weight='semibold'>
          {l10n.t('community.myPosts.empty')}
        </PretendardText>
        <TouchableOpacity
          style={styles.writeButton}
          onPress={handleWrite}
          accessibilityRole='button'
          accessibilityLabel={l10n.t('community.feed.writeButton')}
        >
          <PretendardText style={styles.writeButtonText} weight='semibold'>
            {l10n.t('community.feed.writeButton')}
          </PretendardText>
        </TouchableOpacity>
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
          accessibilityLabel={l10n.t('community.feed.retry')}
        >
          <PretendardText style={styles.retryText} weight='semibold'>
            {l10n.t('community.feed.retry')}
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
    (!myPosts.getIsInitialized() || isLoading) && posts.length === 0;
  const listContentStyle = [
    styles.listContent,
    IS_IOS && {
      paddingTop: insets.top + NATIVE_HEADER_HEIGHT + AcgLayout.screenPadding,
    },
    { paddingBottom: listBottomPadding },
  ];

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          headerShown: IS_IOS,
          headerTransparent: true,
          headerTitle: title,
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      {!IS_IOS ? (
        <View
          style={[styles.header, { paddingTop: insets.top }]}
        >
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.back()}
            accessibilityRole='button'
            accessibilityLabel={l10n.t('common.back')}
          >
            <Ionicons name='chevron-back' size={24} color={Acg.ink} />
          </TouchableOpacity>
          <PretendardText style={styles.headerTitle} weight='semibold'>
            {title}
          </PretendardText>
          <View style={styles.headerSpacer} />
        </View>
      ) : null}
      {showSkeleton ? (
        <ScrollView
          contentContainerStyle={listContentStyle}
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
          contentContainerStyle={listContentStyle}
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
      <ToastView toastManager={app.getToastManager()!} bottom={100} />
      <AlertView alertManager={app.getAlertManager()!} />
      <LogInView logInAlertManager={app.getLogInAlertManager()!} />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Acg.paper,
  },
  header: {
    minHeight: 64,
    paddingHorizontal: AcgLayout.screenPadding,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    ...AcgType.screenTitle,
    color: Acg.ink,
  },
  headerSpacer: {
    width: 44,
  },
  listContent: {
    flexGrow: 1,
    gap: AcgLayout.communityCardGap,
    paddingHorizontal: AcgLayout.screenPadding,
    paddingTop: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 120,
  },
  writeButton: {
    minHeight: 48,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: Radius.pill,
    backgroundColor: Acg.lime,
    justifyContent: 'center',
    alignItems: 'center',
  },
  writeButtonText: {
    ...AcgType.control,
    color: Acg.ink,
  },
  emptyTitle: {
    ...AcgType.sectionTitle,
    color: Acg.ink,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 120,
  },
  retryButton: {
    minHeight: 44,
    marginVertical: 12,
    paddingHorizontal: AcgLayout.screenPadding,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radius.pill,
    backgroundColor: Acg.controlFill,
  },
  retryText: {
    ...AcgType.control,
    color: Acg.ink,
  },
  footerLoading: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerSpace: {
    height: 8,
  },
});

export default observer(CommunityMyPostsView);
