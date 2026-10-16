import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgRadius, AcgType } from '@/constants/DesignTokens';
import CommunityComment from '@/model/community/CommunityComment';
import CommunityCommentDeletedReason from '@/model/community/CommunityCommentDeletedReason';
import CommunityDetail, { CommunityReportTarget } from '@/model/community-detail/CommunityDetail';
import CommunityReportTargetType from '@/model/community/CommunityReportTargetType';
import { getCommunityRelativeTime } from '@/model/community/CommunityFormat';
import app from '@/model/app/App';
import BlockSurface from '@/model/block/BlockSurface';
import { canBlockAuthor, confirmUserBlock } from '@/model/block/UserBlockFlow';

interface Props {
  comment: CommunityComment;
  detail: CommunityDetail;
  onReport: (target: CommunityReportTarget) => void;
}

const CommunityDetailCommentRowView = observer(({ comment, detail, onReport }: Props) => {
  const isOwn = comment.getAuthorId() === app.getFirebase().getUserId();
  const deleted = comment.isDeletedPlaceholder();
  const withdrawn = comment.getDeletedReason() === CommunityCommentDeletedReason.Withdrawal;
  // CM-17: 차단한 사람의 댓글은 남의 답글이 달린 경우에만 목록에 남는다(`getComments`) — 자리표시로 그린다.
  const blocked = app.getBlockedUserStore()?.isBlocked(comment.getAuthorId()) ?? false;
  const canBlock = canBlockAuthor(comment.getAuthorId());

  const handlePressBlock = () => {
    confirmUserBlock({
      uid: comment.getAuthorId(),
      name: comment.getAuthorName(),
      surface: BlockSurface.CommunityComment,
      postId: detail.getPostId(),
      commentId: comment.getId(),
    });
  };

  if (blocked && !deleted) {
    return (
      <View style={[styles.row, comment.isReply() && styles.replyRow]}>
        <PretendardText style={styles.deleted}>
          {app.getL10n().t('moderation.block.blockedComment')}
        </PretendardText>
      </View>
    );
  }

  if (deleted) {
    return (
      <View style={[styles.row, comment.isReply() && styles.replyRow]}>
        <PretendardText style={styles.deleted}>
          {withdrawn
            ? app.getL10n().t('community.comment.withdrawn')
            : app.getL10n().t('community.comment.deleted')}
        </PretendardText>
      </View>
    );
  }

  return (
    <View style={[styles.row, comment.isReply() && styles.replyRow]}>
      <PretendardText weight='semibold' style={styles.author}>
        {comment.getAuthorName()}
      </PretendardText>
      <PretendardText style={styles.meta}>
        {getCommunityRelativeTime(comment.getCreatedAt())}
      </PretendardText>
      <PretendardText style={styles.body}>
        {comment.isReply() && comment.getMentionedUserName() ? (
          <>
            {/* 답글 대상 멘션은 본문과 다른 의미색(`mention`)·semibold로 구분한다(CM-7). */}
            <PretendardText style={styles.mention} weight='semibold'>
              {`@${comment.getMentionedUserName()}`}
            </PretendardText>
            {` ${comment.getBody()}`}
          </>
        ) : (
          comment.getBody()
        )}
      </PretendardText>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.action} onPress={() => detail.startReply(comment)} accessibilityRole='button'>
          <PretendardText style={styles.actionText}>{app.getL10n().t('community.comment.replyButton')}</PretendardText>
        </TouchableOpacity>
        {isOwn ? (
          <TouchableOpacity style={styles.action} onPress={() => detail.startEdit(comment)} accessibilityRole='button'>
            <PretendardText style={styles.actionText}>{app.getL10n().t('community.detail.edit')}</PretendardText>
          </TouchableOpacity>
        ) : null}
        {isOwn ? (
          <TouchableOpacity style={styles.action} onPress={() => detail.deleteComment(comment.getId())} accessibilityRole='button'>
            <PretendardText style={styles.actionText}>{app.getL10n().t('community.detail.delete')}</PretendardText>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.action}
            onPress={() => onReport({ targetType: CommunityReportTargetType.Comment, targetAuthorId: comment.getAuthorId(), commentId: comment.getId() })}
            accessibilityRole='button'
          >
            <PretendardText style={styles.actionText}>{app.getL10n().t('moderation.report')}</PretendardText>
          </TouchableOpacity>
        )}
        {/* CM-17: 남의 댓글·답글이면 `신고` 다음 차단. 이름이 길 수 있어 글자는 `차단`, 읽기는 `{닉네임} 차단`. */}
        {!isOwn && canBlock ? (
          <TouchableOpacity
            style={styles.action}
            onPress={handlePressBlock}
            accessibilityRole='button'
            accessibilityLabel={app.getL10n().t('moderation.block.menu', { name: comment.getAuthorName() })}
          >
            <PretendardText style={styles.actionText}>{app.getL10n().t('moderation.block.action')}</PretendardText>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Acg.hairline },
  replyRow: { marginLeft: 20 },
  author: { ...AcgType.rowSubtitle, color: Acg.ink },
  meta: { ...AcgType.meta, color: Acg.textMuted, marginTop: 2 },
  body: { ...AcgType.body, color: Acg.ink, marginTop: 8 },
  mention: { ...AcgType.body, color: Acg.mention },
  actions: { flexDirection: 'row', marginTop: 6 },
  action: { minHeight: 44, justifyContent: 'center', paddingRight: 20, borderRadius: AcgRadius.chip },
  actionText: { ...AcgType.meta, color: Acg.textMuted },
  deleted: { ...AcgType.body, color: Acg.textMuted },
});

export default CommunityDetailCommentRowView;
