import { observer } from 'mobx-react-lite';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgRadius, AcgType, Radius } from '@/constants/DesignTokens';
import CommunityDetail from '@/model/community-detail/CommunityDetail';
import { COMMUNITY_COMMENT_MAX_LENGTH } from '@/model/community/CommunityLimits';
import app from '@/model/app/App';

interface Props {
  detail: CommunityDetail;
  bottomInset: number;
}

const CommunityDetailCommentComposerView = observer(({ detail, bottomInset }: Props) => {
  const target = detail.getReplyTarget();
  const editing = detail.isEditingComment();
  const loggedIn = app.getFirebase().isLoggedIn();

  return (
    <KeyboardAvoidingView style={[styles.composer, { paddingBottom: Math.max(bottomInset, 8) }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {target && !editing && (
        <View style={styles.replyBanner}>
          <PretendardText style={styles.replyText}>{app.getL10n().t('community.comment.replyTo', { name: target.mentionedUserName })}</PretendardText>
          <TouchableOpacity style={styles.cancelReply} onPress={() => detail.cancelReply()} accessibilityRole='button' accessibilityLabel={app.getL10n().t('community.comment.cancelReply')}>
            <Ionicons name='close' size={20} color={Acg.ink} />
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.row}>
        <TextInput
          value={detail.getDraft()}
          onChangeText={value => detail.setDraft(value)}
          onFocus={() => { if (!loggedIn) { app.getLogInAlertManager()?.show(); } }}
          onPressIn={() => { if (!loggedIn) { app.getLogInAlertManager()?.show(); } }}
          editable={loggedIn && !detail.isSubmittingComment()}
          placeholder={app.getL10n().t('community.comment.placeholder')}
          placeholderTextColor={Acg.textMuted}
          maxLength={COMMUNITY_COMMENT_MAX_LENGTH}
          style={styles.input}
          accessibilityLabel={app.getL10n().t('community.comment.placeholder')}
        />
        <TouchableOpacity
          style={[styles.submit, (!detail.getDraft().trim() || detail.isSubmittingComment()) && styles.disabled]}
          onPress={() => void detail.submitComment()}
          disabled={!detail.getDraft().trim() || detail.isSubmittingComment()}
          accessibilityRole='button'
          accessibilityLabel={app.getL10n().t(editing ? 'common.save' : 'community.comment.submit')}
        >
          {editing ? <PretendardText style={styles.submitText} weight='semibold'>{app.getL10n().t('common.save')}</PretendardText> : <Ionicons name='arrow-up' size={20} color={Acg.ink} />}
        </TouchableOpacity>
        {editing && (
          <TouchableOpacity style={styles.cancelEdit} onPress={() => detail.cancelEdit()} accessibilityRole='button'>
            <PretendardText style={styles.cancelEditText}>{app.getL10n().t('common.cancel')}</PretendardText>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
});

const styles = StyleSheet.create({
  composer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: AcgLayout.screenPadding, paddingTop: 8, backgroundColor: Acg.paper, borderTopWidth: 1, borderTopColor: Acg.hairline },
  replyBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 6 },
  replyText: { ...AcgType.meta, color: Acg.textMuted },
  cancelReply: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, minHeight: 44, paddingHorizontal: 14, paddingVertical: 10, borderRadius: AcgRadius.chip, backgroundColor: Acg.controlFill, ...AcgType.control, color: Acg.ink },
  submit: { width: 44, height: 44, borderRadius: Radius.pill, justifyContent: 'center', alignItems: 'center', backgroundColor: Acg.ink },
  submitText: { ...AcgType.meta, color: Acg.paper },
  disabled: { opacity: 0.45 },
  cancelEdit: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: AcgRadius.chip, backgroundColor: Acg.controlFill },
  cancelEditText: { ...AcgType.meta, color: Acg.ink },
});

export default CommunityDetailCommentComposerView;
