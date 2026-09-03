import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { FC, useCallback, useState } from 'react';
import {
  FlatList,
  Platform,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import app from '@/model/app/App';
import PretendardText from '@/components/PretendardText';
import BottomMenuModalView from '@/components/ui/BottomMenuModalView';
import AlertView from '@/components/alert/AlertView';
import ToastView from '@/components/toast/ToastView';
import LogInView from '@/components/login/LogInView';
import {
  Acg,
  AcgLayout,
  AcgType,
} from '@/constants/DesignTokens';
import CommunityReportTargetType from '@/model/community/CommunityReportTargetType';
import CommunityDetail, {
  CommunityReportTarget,
} from '@/model/community-detail/CommunityDetail';
import CommunityDetailEmptyView from './CommunityDetailEmptyView';
import CommunityDetailErrorView from './CommunityDetailErrorView';
import CommunityDetailSkeletonView from './CommunityDetailSkeletonView';
import CommunityDetailCommentRowView from './CommunityDetailCommentRowView';
import CommunityDetailPostHeaderView from './CommunityDetailPostHeaderView';
import CommunityDetailCommentComposerView from './CommunityDetailCommentComposerView';
import getCommunityReportMenuItems, { CommunityReportSheetTarget } from './CommunityDetailReportMenu';

interface Props {
  detail: CommunityDetail;
}

const COMMENT_COMPOSER_HEIGHT = 44;
const COMMENT_COMPOSER_TOP_PADDING = 8;
const COMMENT_REPLY_BANNER_HEIGHT = 50;
const CONTENT_BOTTOM_EXTRA = 24;
const NATIVE_HEADER_HEIGHT = 44;
const COMMENT_COMPOSER_BOTTOM_GAP = 8;
const IS_IOS = Platform.OS === 'ios';

const CommunityDetailView: FC<Props> = ({ detail }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [showMenu, setShowMenu] = useState(false);
  const [reportTarget, setReportTarget] = useState<CommunityReportSheetTarget | null>(
    null
  );
  const composerBottomInset = Math.max(insets.bottom, 8);
  const contentBottomPadding =
    COMMENT_COMPOSER_HEIGHT +
    COMMENT_COMPOSER_TOP_PADDING +
    COMMENT_REPLY_BANNER_HEIGHT +
    composerBottomInset +
    COMMENT_COMPOSER_BOTTOM_GAP +
    CONTENT_BOTTOM_EXTRA;

  useFocusEffect(
    useCallback(() => {
      void detail.refresh();
    }, [detail])
  );

  const post = detail.getPost();
  const isOwner = Boolean(
    post && post.getAuthorId() === app.getFirebase().getUserId()
  );

  const openReport = (target: CommunityReportTarget) => {
    setShowMenu(false);

    if (!app.getFirebase().isLoggedIn()) {
      app.getLogInAlertManager()?.show();

      return;
    }

    setTimeout(() => setReportTarget({ target }), 0);
  };

  const closeReport = () => {
    setReportTarget(null);
  };

  const renderHeaderActions = () => {
    if (!post) {
      return null;
    }

    return (
      <TouchableOpacity
        style={styles.headerButton}
        onPress={() => setShowMenu(true)}
        accessibilityRole='button'
        accessibilityLabel={app.getL10n().t('community.detail.menu')}
      >
        <Ionicons name='ellipsis-horizontal' size={24} color={Acg.ink} />
      </TouchableOpacity>
    );
  };

  const content = detail.isLoading() ? (
    <CommunityDetailSkeletonView />
  ) : detail.isNotFound() ? (
    <CommunityDetailEmptyView onBack={() => router.back()} />
  ) : detail.hasError() && !post ? (
    <CommunityDetailErrorView onRetry={() => detail.refresh()} />
  ) : post ? (
    <FlatList
      data={detail.getComments()}
      keyExtractor={comment => comment.getId()}
      renderItem={({ item }) => (
        <CommunityDetailCommentRowView
          comment={item}
          detail={detail}
          onReport={openReport}
        />
      )}
      ListHeaderComponent={
        <CommunityDetailPostHeaderView post={post} detail={detail} width={width} />
      }
      ListEmptyComponent={
        <PretendardText style={styles.emptyComments}>
          {app.getL10n().t('community.detail.emptyComments')}
        </PretendardText>
      }
      ListFooterComponent={
        detail.hasMoreCommentsPage() ? (
          <TouchableOpacity
            style={styles.loadMoreButton}
            onPress={() => detail.loadMoreComments()}
            disabled={detail.isLoadingComments()}
            accessibilityRole='button'
          >
            <PretendardText weight='semibold' style={styles.loadMoreText}>
              {app.getL10n().t('community.comment.loadMore')}
            </PretendardText>
          </TouchableOpacity>
        ) : null
      }
      contentContainerStyle={[
        styles.listContent,
        IS_IOS && {
          paddingTop: insets.top + NATIVE_HEADER_HEIGHT,
        },
        { paddingBottom: contentBottomPadding },
      ]}
      contentInsetAdjustmentBehavior='never'
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps='handled'
    />
  ) : null;

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          headerShown: IS_IOS,
          headerTransparent: true,
          headerTitle: '',
          headerBackButtonDisplayMode: 'minimal',
          ...(post ? { headerRight: renderHeaderActions } : {}),
        }}
      />
      {!IS_IOS && (
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.back()}
            accessibilityRole='button'
            accessibilityLabel={app.getL10n().t('community.detail.back')}
          >
            <Ionicons name='chevron-back' size={24} color={Acg.ink} />
          </TouchableOpacity>
          {renderHeaderActions()}
        </View>
      )}
      <View style={styles.content}>{content}</View>
      {post && !detail.isNotFound() && (
        <CommunityDetailCommentComposerView detail={detail} bottomInset={composerBottomInset} />
      )}
      <BottomMenuModalView
        visible={showMenu}
        onClose={() => setShowMenu(false)}
        menuItems={
          isOwner
            ? [
                {
                  icon: 'create-outline',
                  text: app.getL10n().t('community.detail.edit'),
                  onPress: () => {
                    router.push(`/community/${post?.getId()}/edit`);
                  },
                },
                {
                  icon: 'trash-outline',
                  text: app.getL10n().t('community.detail.delete'),
                  onPress: () => detail.deletePost(),
                },
              ]
            : [
                {
                  icon: 'flag-outline',
                  text: app.getL10n().t('community.report.title'),
                  onPress: () =>
                    post &&
                    openReport({
                      targetType: CommunityReportTargetType.Post,
                      targetAuthorId: post.getAuthorId(),
                    }),
                },
              ]
        }
      />
      <BottomMenuModalView
        visible={reportTarget !== null}
        onClose={closeReport}
        menuItems={getCommunityReportMenuItems(reportTarget, detail, closeReport)}
      />
      <ToastView toastManager={app.getToastManager()!} bottom={100} />
      <AlertView alertManager={app.getAlertManager()!} />
      <LogInView logInAlertManager={app.getLogInAlertManager()!} />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Acg.paper },
  header: {
    minHeight: 52,
    paddingHorizontal: AcgLayout.screenPadding,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Acg.paper,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { flex: 1 },
  listContent: { paddingHorizontal: AcgLayout.screenPadding },
  emptyComments: { ...AcgType.body, color: Acg.textMuted, paddingVertical: 24 },
  loadMoreButton: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  loadMoreText: { ...AcgType.control, color: Acg.ink },
});

export default observer(CommunityDetailView);
