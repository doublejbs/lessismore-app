import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgRadius, AcgType } from '@/constants/DesignTokens';
import Comment from '@/model/reply/Comment';
import Reply from '@/model/reply/Reply';
import dayjs from 'dayjs';
import { useRouter } from 'expo-router';
import { FC, useState } from 'react';
import { observer } from 'mobx-react-lite';
import app from '@/model/app/App';
import BottomMenuModalView from '../ui/BottomMenuModalView';
import ReportReasonSheetView from '../report/ReportReasonSheetView';
import getModerationMenuItems from '../report/ModerationMenuItems';
import BlockSurface from '@/model/block/BlockSurface';
import { canBlockAuthor, confirmUserBlock } from '@/model/block/UserBlockFlow';
import CommunityReportReason from '@/model/community/CommunityReportReason';
import CommunityReportTargetType from '@/model/community/CommunityReportTargetType';
import { reportContent, requireReportLogin } from '@/model/report/ContentReportFlow';
import StarRatingView from '../camp-site/StarRatingView';

interface Props {
  gearId: string;
  comment: Comment;
  reply: Reply;
}

// 좋아요 빨강은 의미색이라 ACG 액센트(라임)로 바꾸지 않는다.
const LIKED_COLOR = '#FF6B6B';

const ReplyItemView: FC<Props> = ({ gearId, comment, reply }) => {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const isLiked = reply.isCommentLiked(comment.id);
  const currentUserId = app.getFirebase().getUserId();
  const isMyComment = comment.authorId === currentUserId;
  // CM-10·CM-17: 남의 리뷰·답글에는 `⋯` → `신고` / `{닉네임} 차단`.
  const canModerate = !isMyComment && canBlockAuthor(comment.authorId);

  const handlePress = () => {
    router.push(`/reply/${gearId}/${comment.id}`);
  };

  const handleLikePress = (e: any) => {
    e.stopPropagation();
    app.getAnalyticsManager()?.logClick('reply_like', { liked: !isLiked });
    reply.toggleLike(comment.id);
  };

  const handlePressMore = (e: any) => {
    e.stopPropagation();
    setShowMenu(true);
  };

  const handleCloseMenu = () => {
    setShowMenu(false);
  };

  const handlePressEdit = () => {
    setShowMenu(false);
    router.push(`/reply/${gearId}/${comment.id}/edit`);
  };

  const handlePressDelete = () => {
    setShowMenu(false);
    reply.showDeleteConfirm(comment.id);
  };

  const ownerMenuItems = [
    {
      icon: 'pencil' as const,
      text: app.getL10n().t('reply.edit'),
      onPress: handlePressEdit,
    },
    {
      icon: 'trash-outline' as const,
      text: app.getL10n().t('reply.deleteAction'),
      onPress: handlePressDelete,
    },
  ];

  const handlePressReport = () => {
    if (!requireReportLogin()) {
      return;
    }

    setShowReport(true);
  };

  const handleCloseReport = () => {
    setShowReport(false);
  };

  const handleSelectReportReason = (reason: CommunityReportReason) => {
    void reportContent({
      targetType: CommunityReportTargetType.GearComment,
      postId: gearId,
      commentId: comment.id,
      targetAuthorId: comment.authorId,
      reason,
    });
  };

  const handlePressBlock = () => {
    confirmUserBlock({
      uid: comment.authorId,
      name: comment.authorName,
      surface: BlockSurface.GearComment,
      postId: gearId,
      commentId: comment.id,
    });
  };

  const menuItems = isMyComment
    ? ownerMenuItems
    : getModerationMenuItems({
        authorName: comment.authorName,
        onReport: handlePressReport,
        onBlock: handlePressBlock,
      });

  // CM-17: 차단한 사람의 리뷰는 남의 답글이 달렸을 때만 목록에 남는다(`Reply.getComments`) — 자리표시로
  // 그리고, 누르면 답글 화면으로 간다(남의 답글을 숨기지 않는다).
  if (app.getBlockedUserStore()?.isBlocked(comment.authorId)) {
    return (
      <TouchableOpacity
        style={styles.container}
        activeOpacity={0.7}
        onPress={handlePress}
        accessibilityRole='button'
      >
        <PretendardText style={styles.blockedText}>
          {app.getL10n().t('moderation.block.blockedComment')}
        </PretendardText>
      </TouchableOpacity>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={styles.container}
        activeOpacity={0.7}
        onPress={handlePress}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <PretendardText weight='semibold' style={styles.name}>
              {comment.authorName}
            </PretendardText>
            {/* RP-7: 내 리뷰는 라임 글자가 아니라 메타 줄의 조각으로 밝힌다 —
                라임은 화면당 하나(주 액션 면)이고, 배지는 행 안에 두지 않는다. */}
            <PretendardText style={styles.date}>
              {dayjs(comment.createdAt).format('YYYY.MM.DD')}
              {isMyComment ? ` · ${app.getL10n().t('reply.myReview')}` : ''}
            </PretendardText>
          </View>
          {(isMyComment || canModerate) && (
            <TouchableOpacity
              onPress={handlePressMore}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole='button'
              accessibilityLabel={app.getL10n().t(
                isMyComment ? 'reply.reviewManage' : 'moderation.more'
              )}
            >
              <Ionicons
                name='ellipsis-horizontal'
                size={16}
                color={Acg.textMuted}
              />
            </TouchableOpacity>
          )}
        </View>
        {comment.rating !== undefined && (
          <StarRatingView rating={comment.rating} size={14} />
        )}
        <View style={styles.contentContainer}>
          <PretendardText style={styles.content}>
            {comment.content}
          </PretendardText>
          <View style={styles.likeCountContainer}>
            <TouchableOpacity
              style={styles.iconWithText}
              onPress={handleLikePress}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole='button'
              accessibilityLabel={app.getL10n().t(isLiked ? 'reply.unlike' : 'reply.like')}
              accessibilityState={{ selected: isLiked }}
            >
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={20}
                color={isLiked ? LIKED_COLOR : Acg.textMuted}
              />
              <PretendardText
                style={[styles.likeCount, isLiked && styles.likeCountActive]}
              >
                {comment.likeCount}
              </PretendardText>
            </TouchableOpacity>
            <View
              style={styles.iconWithText}
              accessible
              accessibilityLabel={app.getL10n().t('reply.replyCount', { count: comment.replyCount })}
            >
              <Ionicons
                name='chatbubble-outline'
                size={20}
                color={Acg.textMuted}
              />
              <PretendardText style={styles.replyCount}>
                {comment.replyCount}
              </PretendardText>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      <BottomMenuModalView
        visible={showMenu}
        onClose={handleCloseMenu}
        menuItems={menuItems}
      />
      <ReportReasonSheetView
        visible={showReport}
        onClose={handleCloseReport}
        onSelect={handleSelectReportReason}
      />
    </>
  );
};

const styles = StyleSheet.create({
  // RP-7: 순백 지면 위 연회색 면 + 모서리 12, 그림자 없음. 행 사이 간격이 구분을 맡는다.
  container: {
    flexDirection: 'column',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 14,
    backgroundColor: Acg.controlFill,
    borderRadius: AcgRadius.thumb,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'column',
    gap: 4,
  },
  name: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
  date: {
    ...AcgType.meta,
    color: Acg.textMuted,
  },
  likeCountContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  iconWithText: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contentContainer: {
    flexDirection: 'column',
    gap: 12,
  },
  // 여러 줄 문단이라 `body`(14/21)다 — 옛 `sectionSubtitle`(15)은 한 줄 부제 단이었다.
  content: {
    ...AcgType.body,
    color: Acg.ink,
  },
  blockedText: {
    ...AcgType.body,
    color: Acg.textMuted,
  },
  likeCount: {
    ...AcgType.rowSubtitle,
    color: Acg.textMuted,
  },
  likeCountActive: {
    color: LIKED_COLOR,
  },
  replyCount: {
    ...AcgType.rowSubtitle,
    color: Acg.textMuted,
  },
});

export default observer(ReplyItemView);
