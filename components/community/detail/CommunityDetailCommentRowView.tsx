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

interface Props {
  comment: CommunityComment;
  detail: CommunityDetail;
  onReport: (target: CommunityReportTarget) => void;
}

const CommunityDetailCommentRowView = observer(({ comment, detail, onReport }: Props) => {
  const isOwn = comment.getAuthorId() === app.getFirebase().getUserId();
  const deleted = comment.isDeletedPlaceholder();
  const withdrawn = comment.getDeletedReason() === CommunityCommentDeletedReason.Withdrawal;

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
        {comment.isReply() && comment.getMentionedUserName()
          ? `@${comment.getMentionedUserName()} ${comment.getBody()}`
          : comment.getBody()}
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
            <PretendardText style={styles.actionText}>{app.getL10n().t('community.report.title')}</PretendardText>
          </TouchableOpacity>
        )}
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
  actions: { flexDirection: 'row', marginTop: 6 },
  action: { minHeight: 44, justifyContent: 'center', paddingRight: 20, borderRadius: AcgRadius.chip },
  actionText: { ...AcgType.meta, color: Acg.textMuted },
  deleted: { ...AcgType.body, color: Acg.textMuted },
});

export default CommunityDetailCommentRowView;
