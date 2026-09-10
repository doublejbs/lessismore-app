import { FC, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  ListRenderItemInfo,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import CommunityFeedCardView from '@/components/community/feed/CommunityFeedCardView';
import CommunityFeedSkeletonView from '@/components/community/feed/CommunityFeedSkeletonView';
import { Acg, AcgLayout, AcgRadius, AcgType } from '@/constants/DesignTokens';
import CommunityPost from '@/model/community/CommunityPost';
import CommunitySearch from '@/model/community-search/CommunitySearch';
import app from '@/model/app/App';

interface Props {
  search: CommunitySearch;
}

const NATIVE_HEADER_HEIGHT = 44;
const IS_IOS = Platform.OS === 'ios';
const END_REACHED_THRESHOLD = 0.3;

const CommunitySearchView: FC<Props> = ({ search }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const l10n = app.getL10n();
  const query = search.getQuery();
  const trimmedQuery = query.trim();
  const posts = search.getPosts();
  const error = search.getError();
  const isLoading = search.getIsLoading();
  const isLoadingMore = search.getIsLoadingMore();
  const hasSearched = search.getHasSearched();
  const title = l10n.t('community.search.title');

  const handleChangeText = useCallback(
    (text: string) => {
      search.setQuery(text);
    },
    [search]
  );

  const handleClear = useCallback(() => {
    search.setQuery('');
  }, [search]);

  const handleRetry = useCallback(() => {
    void search.retry();
  }, [search]);

  const handleEndReached = useCallback(() => {
    void search.loadMore();
  }, [search]);

  const handlePostPress = useCallback(
    (post: CommunityPost) => {
      app.getAnalyticsManager()?.logClick('community_search_result', {
        has_packing: post.hasBagSnapshot(),
        has_poll: post.hasPoll(),
        query_length: trimmedQuery.length,
      });
      router.push(`/community/${post.getId()}`);
    },
    [router, trimmedQuery.length]
  );

  const renderItem = ({ item }: ListRenderItemInfo<CommunityPost>) => {
    return (
      <CommunityFeedCardView
        post={item}
        onPress={() => handlePostPress(item)}
      />
    );
  };

  const renderFooter = () => {
    if (error) {
      return (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={handleRetry}
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

  const renderEmpty = () => {
    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <PretendardText style={styles.emptyTitle} weight='semibold'>
            {l10n.t('community.feed.loadFailed')}
          </PretendardText>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetry}
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

    if (!hasSearched || trimmedQuery.length < 1) {
      return (
        <View style={styles.emptyContainer}>
          <PretendardText style={styles.emptyHint}>
            {l10n.t('community.search.hint')}
          </PretendardText>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <PretendardText style={styles.emptyHint}>
          {l10n.t('community.search.empty', { query: trimmedQuery })}
        </PretendardText>
      </View>
    );
  };

  const showSkeleton = isLoading && posts.length === 0;
  const listContentStyle = [
    styles.listContent,
    { paddingBottom: insets.bottom + AcgLayout.screenPadding },
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
        <View style={[styles.header, { paddingTop: insets.top }]}>
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
      <View
        style={[
          styles.content,
          IS_IOS && {
            paddingTop:
              insets.top + NATIVE_HEADER_HEIGHT + AcgLayout.screenPadding,
          },
        ]}
      >
        <View style={styles.searchField}>
          <Ionicons name='search' size={20} color={Acg.ink} />
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={handleChangeText}
            placeholder={l10n.t('community.search.placeholder')}
            placeholderTextColor={Acg.textMuted}
            autoCapitalize='none'
            autoCorrect={false}
            autoFocus
            returnKeyType='search'
          />
          {query.length > 0 ? (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClear}
              accessibilityRole='button'
              accessibilityLabel={l10n.t('community.search.clear')}
            >
              <Ionicons name='close-circle' size={20} color={Acg.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
        {showSkeleton ? (
          <ScrollView
            contentContainerStyle={styles.skeletonContent}
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
            keyboardShouldPersistTaps='handled'
            onScrollBeginDrag={Keyboard.dismiss}
            ListEmptyComponent={renderEmpty}
            ListFooterComponent={renderFooter}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Acg.paper,
  },
  content: {
    flex: 1,
    paddingHorizontal: AcgLayout.screenPadding,
    paddingTop: AcgLayout.screenPadding,
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
  searchField: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: AcgLayout.chipGap,
    paddingHorizontal: AcgLayout.chipGap,
    borderRadius: AcgRadius.thumb,
    backgroundColor: Acg.controlFill,
  },
  input: {
    flex: 1,
    padding: 0,
    color: Acg.ink,
    fontSize: AcgType.control.fontSize,
    letterSpacing: AcgType.control.letterSpacing,
  },
  clearButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    flexGrow: 1,
    gap: AcgLayout.communityCardGap,
    paddingTop: AcgLayout.communitySectionFirstGap,
  },
  skeletonContent: {
    gap: AcgLayout.communityCardGap,
    paddingTop: AcgLayout.communitySectionFirstGap,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: AcgLayout.screenPadding,
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
  retryButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: AcgLayout.screenPadding,
    borderRadius: AcgRadius.chip,
    backgroundColor: Acg.controlFill,
  },
  retryText: {
    ...AcgType.control,
    color: Acg.ink,
  },
  footerLoading: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerSpace: {
    minHeight: AcgLayout.screenPadding,
  },
});

export default observer(CommunitySearchView);
