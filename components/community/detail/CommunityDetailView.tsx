import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { observer } from 'mobx-react-lite';
import { FC, useCallback, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import app from '@/model/app/App';
import AcgDisplayText from '@/components/acg/AcgDisplayText';
import PretendardText from '@/components/PretendardText';
import BottomMenuModalView from '@/components/ui/BottomMenuModalView';
import AlertView from '@/components/alert/AlertView';
import ToastView from '@/components/toast/ToastView';
import {
  Acg,
  AcgLayout,
  AcgRadius,
  AcgRow,
  AcgType,
  Radius,
} from '@/constants/DesignTokens';
import CommunityComment from '@/model/community/CommunityComment';
import CommunityCommentDeletedReason from '@/model/community/CommunityCommentDeletedReason';
import CommunityPost from '@/model/community/CommunityPost';
import CommunityPostType from '@/model/community/CommunityPostType';
import CommunityReportReason from '@/model/community/CommunityReportReason';
import CommunityReportTargetType from '@/model/community/CommunityReportTargetType';
import CommunityDetail, {
  CommunityReportTarget,
} from '@/model/community-detail/CommunityDetail';

interface Props {
  detail: CommunityDetail;
}

interface ReportSheetTarget {
  target: CommunityReportTarget;
}

const COMMENT_COMPOSER_HEIGHT = 44;
const COMMENT_COMPOSER_TOP_PADDING = 8;
const COMMENT_REPLY_BANNER_HEIGHT = 40;
const CONTENT_BOTTOM_EXTRA = 24;

const CommunityDetailView: FC<Props> = ({ detail }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [showMenu, setShowMenu] = useState(false);
  const [reportTarget, setReportTarget] = useState<ReportSheetTarget | null>(
    null
  );
  const composerBottomInset = Math.max(insets.bottom, 8);
  const contentBottomPadding =
    COMMENT_COMPOSER_HEIGHT +
    COMMENT_COMPOSER_TOP_PADDING +
    COMMENT_REPLY_BANNER_HEIGHT +
    composerBottomInset +
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

  const content = detail.isLoading() ? (
    <CommunityDetailSkeletonView />
  ) : detail.isNotFound() ? (
    <EmptyDetailView onBack={() => router.back()} />
  ) : detail.hasError() && !post ? (
    <ErrorDetailView onRetry={() => detail.refresh()} />
  ) : post ? (
    <FlatList
      data={detail.getComments()}
      keyExtractor={comment => comment.getId()}
      renderItem={({ item }) => (
        <CommentRow
          comment={item}
          detail={detail}
          onReport={openReport}
        />
      )}
      ListHeaderComponent={
        <PostHeader post={post} detail={detail} width={width} />
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
        { paddingBottom: contentBottomPadding },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps='handled'
    />
  ) : null;

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
          accessibilityRole='button'
          accessibilityLabel={app.getL10n().t('community.detail.back')}
        >
          <Ionicons name='chevron-back' size={24} color={Acg.ink} />
        </TouchableOpacity>
        {post && (
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowMenu(true)}
            accessibilityRole='button'
            accessibilityLabel={app.getL10n().t('community.detail.menu')}
          >
            <Ionicons name='ellipsis-horizontal' size={24} color={Acg.ink} />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.content}>{content}</View>
      {post && !detail.isNotFound() && (
        <CommentComposer detail={detail} bottomInset={composerBottomInset} />
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
        menuItems={getReportMenuItems(reportTarget, detail, closeReport)}
      />
      <ToastView toastManager={app.getToastManager()!} bottom={100} />
      <AlertView alertManager={app.getAlertManager()!} />
    </View>
  );
};

const PostHeader: FC<{
  post: CommunityPost;
  detail: CommunityDetail;
  width: number;
}> = ({ post, detail, width }) => {
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const images = post
    .getImages()
    .filter(image => !failedImages.includes(image.id));

  return (
    <View style={styles.postHeader}>
      <PretendardText style={styles.meta}>
        {`${getTypeLabel(post.getType())} · ${post.getAuthorName()} · ${getRelativeTime(post.getCreatedAt())}`}
      </PretendardText>
      <PretendardText weight='semibold' style={styles.title}>
        {post.getTitle()}
      </PretendardText>
      <PretendardText selectable style={styles.body}>
        {post.getBody()}
      </PretendardText>
      {images.length > 0 && (
        <FlatList
          horizontal
          pagingEnabled={images.length > 1}
          data={images}
          keyExtractor={image => image.id}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <Image
              source={item.url}
              style={[
                styles.postImage,
                { width, height: Math.min(width * (item.height / item.width), 420) },
              ]}
              contentFit='contain'
              accessibilityLabel={app.getL10n().t('community.detail.photoLabel', {
                count: index + 1,
                total: post.getImages().length,
              })}
              onError={() =>
                setFailedImages(current =>
                  current.includes(item.id) ? current : [...current, item.id]
                )
              }
            />
          )}
        />
      )}
      {post.getImages().length > 1 && images.length > 0 && (
        <PretendardText style={styles.photoIndicator}>
          {`${images.length}/${post.getImages().length}`}
        </PretendardText>
      )}
      {post.isBagReview() && post.getBagSnapshot() && (
        <BagSnapshotView post={post} />
      )}
      {post.isPoll() && post.getPoll() && (
        <PollView post={post} detail={detail} />
      )}
      <PostActions post={post} detail={detail} />
      <PretendardText weight='semibold' style={styles.commentsTitle}>
        {app.getL10n().t('community.detail.commentsTitle', {
          count: post.getCommentCount(),
        })}
      </PretendardText>
    </View>
  );
};

const BagSnapshotView: FC<{ post: CommunityPost }> = ({ post }) => {
  const snapshot = post.getBagSnapshot()!;
  const date = [snapshot.startDate, snapshot.endDate].filter(Boolean).join(' ~ ');

  return (
    <View style={styles.snapshotCard}>
      <PretendardText weight='semibold' style={styles.snapshotName}>
        {snapshot.name}
      </PretendardText>
      {date ? <PretendardText style={styles.meta}>{date}</PretendardText> : null}
      {snapshot.destinationName ? (
        <PretendardText style={styles.meta}>{snapshot.destinationName}</PretendardText>
      ) : null}
      <View style={styles.snapshotStats}>
        <AcgDisplayText style={styles.snapshotWeight}>
          {`${Math.round((snapshot.totalWeight / 1000) * 100) / 100}kg`}
        </AcgDisplayText>
        <PretendardText style={styles.meta}>
          {` · ${app.getL10n().t('community.detail.gearCount', {
            count: snapshot.itemCount,
          })}`}
        </PretendardText>
      </View>
      {snapshot.gears.map((gear, index) => (
        <View key={`${gear.name}-${index}`} style={styles.gearRow}>
          <PretendardText style={styles.gearName} numberOfLines={2}>
            {`${gear.company} ${gear.name}`}
          </PretendardText>
          <AcgDisplayText style={styles.gearWeight}>{`${gear.weight}g`}</AcgDisplayText>
        </View>
      ))}
    </View>
  );
};

const PollView: FC<{ post: CommunityPost; detail: CommunityDetail }> = ({
  post,
  detail,
}) => {
  const poll = post.getPoll()!;
  const isOwner = post.getAuthorId() === app.getFirebase().getUserId();
  const showResults = isOwner || detail.getMyVoteOptionId() !== null;
  const expired = post.isPollExpired();

  return (
    <View style={styles.pollCard}>
      {poll.options.map(option => {
        const ratio = poll.totalVoteCount
          ? Math.round((option.voteCount / poll.totalVoteCount) * 100)
          : 0;
        const selected = detail.getMyVoteOptionId() === option.id;

        return (
          <Pressable
            key={option.id}
            style={styles.pollRow}
            onPress={() => detail.vote(option.id)}
            disabled={expired || showResults}
            accessibilityRole='radio'
            accessibilityState={{
              selected,
              disabled: expired || showResults,
            }}
          >
            {showResults && (
              <View style={styles.pollTrack}>
                <View style={[styles.pollProgress, { width: `${ratio}%` }]} />
              </View>
            )}
            <PretendardText style={styles.pollText}>
              {option.text}
            </PretendardText>
            {showResults && (
              <PretendardText style={styles.pollCount}>
                {`${option.voteCount} · ${ratio}%${selected ? ' ✓' : ''}`}
              </PretendardText>
            )}
          </Pressable>
        );
      })}
      <PretendardText style={styles.pollMeta}>
        {expired
          ? app.getL10n().t('community.poll.closed')
          : poll.expiresAt
            ? app.getL10n().t('community.poll.closesAt', {
                date: formatDate(poll.expiresAt),
              })
            : null}
      </PretendardText>
      <PretendardText style={styles.pollMeta}>
        {app.getL10n().t('community.poll.participants', {
          count: poll.totalVoteCount,
        })}
      </PretendardText>
    </View>
  );
};

const PostActions: FC<{ post: CommunityPost; detail: CommunityDetail }> = ({
  post,
  detail,
}) => {
  return (
    <View style={styles.actions}>
      <TouchableOpacity
        style={styles.likeButton}
        onPress={() => detail.toggleLike()}
        accessibilityRole='button'
        accessibilityLabel={app.getL10n().t('community.detail.likeLabel', {
          count: post.getLikeCount(),
        })}
        accessibilityState={{ selected: detail.isLiked() }}
      >
        <Ionicons
          name={detail.isLiked() ? 'heart' : 'heart-outline'}
          size={22}
          color={Acg.ink}
        />
        <PretendardText style={styles.actionCount}>
          {String(post.getLikeCount())}
        </PretendardText>
      </TouchableOpacity>
      <View style={styles.commentCount}>
        <Ionicons name='chatbubble-outline' size={20} color={Acg.textMuted} />
        <PretendardText style={styles.actionCount}>
          {String(post.getCommentCount())}
        </PretendardText>
      </View>
    </View>
  );
};

const CommentRow: FC<{
  comment: CommunityComment;
  detail: CommunityDetail;
  onReport: (target: CommunityReportTarget) => void;
}> = ({ comment, detail, onReport }) => {
  const isOwn = comment.getAuthorId() === app.getFirebase().getUserId();
  const deleted = comment.isDeletedPlaceholder();
  const withdrawn = comment.getDeletedReason() === CommunityCommentDeletedReason.Withdrawal;

  if (deleted) {
    return (
      <View style={[styles.commentRow, comment.isReply() && styles.replyRow]}>
        <PretendardText style={styles.deletedComment}>
          {withdrawn
            ? app.getL10n().t('community.comment.withdrawn')
            : app.getL10n().t('community.comment.deleted')}
        </PretendardText>
      </View>
    );
  }

  return (
    <View style={[styles.commentRow, comment.isReply() && styles.replyRow]}>
      <PretendardText weight='semibold' style={styles.commentAuthor}>
        {comment.getAuthorName()}
      </PretendardText>
      <PretendardText style={styles.commentMeta}>
        {getRelativeTime(comment.getCreatedAt())}
      </PretendardText>
      {comment.isReply() && comment.getMentionedUserName() ? (
        <PretendardText style={styles.commentBody}>
          {`@${comment.getMentionedUserName()} `}
          {comment.getBody()}
        </PretendardText>
      ) : (
        <PretendardText style={styles.commentBody}>
          {comment.getBody()}
        </PretendardText>
      )}
      <View style={styles.commentActions}>
        <TouchableOpacity
          style={styles.commentActionButton}
          onPress={() => detail.startReply(comment)}
          accessibilityRole='button'
        >
          <PretendardText style={styles.commentActionText}>
            {app.getL10n().t('community.comment.replyButton')}
          </PretendardText>
        </TouchableOpacity>
        {isOwn ? (
          <TouchableOpacity
            style={styles.commentActionButton}
            onPress={() => detail.deleteComment(comment.getId())}
            accessibilityRole='button'
          >
            <PretendardText style={styles.commentActionText}>
              {app.getL10n().t('community.detail.delete')}
            </PretendardText>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.commentActionButton}
            onPress={() =>
              onReport({
                targetType: CommunityReportTargetType.Comment,
                targetAuthorId: comment.getAuthorId(),
                commentId: comment.getId(),
              })
            }
            accessibilityRole='button'
          >
            <PretendardText style={styles.commentActionText}>
              {app.getL10n().t('community.report.title')}
            </PretendardText>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const CommentComposer: FC<{ detail: CommunityDetail; bottomInset: number }> = ({
  detail,
  bottomInset,
}) => {
  const target = detail.getReplyTarget();
  const loggedIn = app.getFirebase().isLoggedIn();

  return (
    <KeyboardAvoidingView
      style={[styles.composer, { paddingBottom: Math.max(bottomInset, 8) }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {target && (
        <View style={styles.replyBanner}>
          <PretendardText style={styles.replyBannerText}>
            {app.getL10n().t('community.comment.replyTo', {
              name: target.mentionedUserName,
            })}
          </PretendardText>
          <TouchableOpacity
            style={styles.cancelReplyButton}
            onPress={() => detail.cancelReply()}
            accessibilityRole='button'
            accessibilityLabel={app.getL10n().t('community.comment.cancelReply')}
          >
            <Ionicons name='close' size={20} color={Acg.ink} />
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.composerRow}>
        <TextInput
          value={detail.getDraft()}
          onChangeText={value => detail.setDraft(value)}
          onFocus={() => {
            if (!loggedIn) {
              app.getLogInAlertManager()?.show();
            }
          }}
          onPressIn={() => {
            if (!loggedIn) {
              app.getLogInAlertManager()?.show();
            }
          }}
          editable={loggedIn && !detail.isSubmittingComment()}
          placeholder={app.getL10n().t('community.comment.placeholder')}
          placeholderTextColor={Acg.textMuted}
          maxLength={1000}
          style={styles.composerInput}
          accessibilityLabel={app.getL10n().t('community.comment.placeholder')}
        />
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!detail.getDraft().trim() || detail.isSubmittingComment()) &&
              styles.submitButtonDisabled,
          ]}
          onPress={() => detail.submitComment()}
          disabled={!detail.getDraft().trim() || detail.isSubmittingComment()}
          accessibilityRole='button'
          accessibilityLabel={app.getL10n().t('community.comment.submit')}
        >
          <Ionicons name='arrow-up' size={20} color={Acg.ink} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const getReportMenuItems = (
  target: ReportSheetTarget | null,
  detail: CommunityDetail,
  close: () => void
) => {
  if (!target) {
    return [];
  }

  const reasons: [CommunityReportReason, string][] = [
    [CommunityReportReason.Spam, 'spam'],
    [CommunityReportReason.Harassment, 'harassment'],
    [CommunityReportReason.SexualViolence, 'sexualViolence'],
    [CommunityReportReason.Copyright, 'copyright'],
    [CommunityReportReason.Privacy, 'privacy'],
    [CommunityReportReason.Other, 'other'],
  ];

  return reasons.map(([reason, key]) => ({
    icon: 'flag-outline' as const,
    text: app.getL10n().t(`community.report.${key}`),
    onPress: () => {
      close();
      setTimeout(() => detail.report(target.target, reason), 0);
    },
  }));
};

const getTypeLabel = (type: CommunityPostType) => {
  const key =
    type === CommunityPostType.Question
      ? 'question'
      : type === CommunityPostType.BagReview
        ? 'bagReview'
        : 'poll';

  return app.getL10n().t(`community.type.${key}`);
};

const getRelativeTime = (date: Date) => {
  const elapsed = Math.max(0, Date.now() - date.getTime());
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (elapsed < minute) {
    return app.getL10n().t('community.feed.justNow');
  }

  if (elapsed < hour) {
    return app.getL10n().t('community.feed.minutesAgo', {
      count: Math.floor(elapsed / minute),
    });
  }

  if (elapsed < day) {
    return app.getL10n().t('community.feed.hoursAgo', {
      count: Math.floor(elapsed / hour),
    });
  }

  return app.getL10n().t('community.feed.daysAgo', {
    count: Math.floor(elapsed / day),
  });
};

const formatDate = (date: Date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const EmptyDetailView: FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <View style={styles.stateContainer}>
      <PretendardText weight='semibold' style={styles.stateTitle}>
        {app.getL10n().t('community.detail.notFound')}
      </PretendardText>
      <TouchableOpacity style={styles.stateButton} onPress={onBack}>
        <PretendardText weight='semibold' style={styles.stateButtonText}>
          {app.getL10n().t('community.detail.back')}
        </PretendardText>
      </TouchableOpacity>
    </View>
  );
};

const ErrorDetailView: FC<{ onRetry: () => void }> = ({ onRetry }) => {
  return (
    <View style={styles.stateContainer}>
      <PretendardText weight='semibold' style={styles.stateTitle}>
        {app.getL10n().t('community.detail.failed')}
      </PretendardText>
      <TouchableOpacity style={styles.stateButton} onPress={onRetry}>
        <PretendardText weight='semibold' style={styles.stateButtonText}>
          {app.getL10n().t('community.detail.retry')}
        </PretendardText>
      </TouchableOpacity>
    </View>
  );
};

const CommunityDetailSkeletonView = () => {
  return (
    <View style={styles.skeleton}>
      <View style={styles.skeletonLine} />
      <View style={[styles.skeletonLine, styles.skeletonTitle]} />
      <View style={styles.skeletonBlock} />
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
  postHeader: { paddingTop: 12, paddingBottom: 8 },
  meta: { ...AcgType.meta, color: Acg.textMuted },
  title: { ...AcgType.sectionTitle, color: Acg.ink, marginTop: 12 },
  body: { ...AcgType.body, color: Acg.ink, marginTop: 16 },
  postImage: { marginTop: 20, backgroundColor: Acg.controlFill },
  photoIndicator: { ...AcgType.meta, color: Acg.textMuted, textAlign: 'center', marginTop: 8 },
  snapshotCard: {
    marginTop: 24,
    padding: 16,
    backgroundColor: Acg.controlFill,
    borderRadius: AcgRadius.thumb,
  },
  snapshotName: { ...AcgType.rowTitle, color: Acg.ink },
  snapshotStats: { flexDirection: 'row', alignItems: 'baseline', marginTop: 8 },
  snapshotWeight: { ...AcgType.displaySmall, color: Acg.ink },
  gearRow: {
    minHeight: AcgRow.minHeight,
    paddingVertical: AcgRow.paddingVertical,
    borderTopWidth: 1,
    borderTopColor: Acg.hairline,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gearName: { ...AcgType.rowSubtitle, color: Acg.ink, flex: 1, marginRight: 12 },
  gearWeight: { color: Acg.ink },
  pollCard: { marginTop: 24 },
  pollRow: {
    minHeight: 44,
    paddingHorizontal: 12,
    marginBottom: 8,
    justifyContent: 'center',
    borderRadius: AcgRadius.chip,
    overflow: 'hidden',
    backgroundColor: Acg.controlFill,
  },
  pollTrack: { ...StyleSheet.absoluteFill, backgroundColor: Acg.controlFill },
  pollProgress: { height: '100%', backgroundColor: Acg.ink, opacity: 0.12 },
  pollText: { ...AcgType.control, color: Acg.ink },
  pollCount: { ...AcgType.meta, color: Acg.ink, position: 'absolute', right: 12 },
  pollMeta: { ...AcgType.meta, color: Acg.textMuted, marginTop: 4 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Acg.hairline,
  },
  likeButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', paddingRight: 20 },
  actionCount: { ...AcgType.control, color: Acg.ink, marginLeft: 6 },
  commentCount: { minHeight: 44, flexDirection: 'row', alignItems: 'center' },
  commentsTitle: { ...AcgType.sectionTitle, color: Acg.ink, marginTop: 20, marginBottom: 4 },
  commentRow: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Acg.hairline },
  replyRow: { marginLeft: 20 },
  commentAuthor: { ...AcgType.rowSubtitle, color: Acg.ink },
  commentMeta: { ...AcgType.meta, color: Acg.textMuted, marginTop: 2 },
  commentBody: { ...AcgType.body, color: Acg.ink, marginTop: 8 },
  commentActions: { flexDirection: 'row', marginTop: 6 },
  commentActionButton: { minHeight: 44, justifyContent: 'center', paddingRight: 20 },
  commentActionText: { ...AcgType.meta, color: Acg.textMuted },
  deletedComment: { ...AcgType.body, color: Acg.textMuted },
  emptyComments: { ...AcgType.body, color: Acg.textMuted, paddingVertical: 24 },
  loadMoreButton: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  loadMoreText: { ...AcgType.control, color: Acg.ink },
  composer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: AcgLayout.screenPadding,
    paddingTop: 8,
    backgroundColor: Acg.paper,
    borderTopWidth: 1,
    borderTopColor: Acg.hairline,
  },
  composerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  composerInput: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: AcgRadius.chip,
    backgroundColor: Acg.controlFill,
    ...AcgType.control,
    color: Acg.ink,
  },
  submitButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Acg.lime,
  },
  submitButtonDisabled: { opacity: 0.45 },
  replyBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 6 },
  replyBannerText: { ...AcgType.meta, color: Acg.textMuted },
  cancelReplyButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  stateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  stateTitle: { ...AcgType.sectionTitle, color: Acg.ink, textAlign: 'center' },
  stateButton: { minHeight: 44, marginTop: 20, paddingHorizontal: 24, justifyContent: 'center', borderRadius: Radius.pill, backgroundColor: Acg.ink },
  stateButtonText: { ...AcgType.control, color: Acg.paper },
  skeleton: { padding: AcgLayout.screenPadding },
  skeletonLine: { height: 16, width: '35%', backgroundColor: Acg.controlFill, borderRadius: 4 },
  skeletonTitle: { width: '75%', height: 28, marginTop: 20 },
  skeletonBlock: { height: 120, marginTop: 20, backgroundColor: Acg.controlFill, borderRadius: AcgRadius.thumb },
});

export default observer(CommunityDetailView);
