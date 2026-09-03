import { Pressable, StyleSheet, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgRadius, AcgType } from '@/constants/DesignTokens';
import CommunityPost from '@/model/community/CommunityPost';
import CommunityDetail from '@/model/community-detail/CommunityDetail';
import app from '@/model/app/App';
import { formatCommunityDate } from '@/model/community/CommunityFormat';

interface Props {
  post: CommunityPost;
  detail: CommunityDetail;
}

const CommunityDetailPollView = observer(({ post, detail }: Props) => {
  const poll = post.getPoll();

  if (!poll) {
    return null;
  }

  const expired = post.isPollExpired();
  const showResults = post.getAuthorId() === app.getFirebase().getUserId()
    || detail.getMyVoteOptionId() !== null
    || expired;

  return (
    <View style={styles.card}>
      {poll.options.map(option => {
        const ratio = poll.totalVoteCount
          ? Math.round((option.voteCount / poll.totalVoteCount) * 100)
          : 0;
        const selected = detail.getMyVoteOptionId() === option.id;
        const disabled = expired
          || detail.isVoteInProgress();

        return (
          <Pressable
            key={option.id}
            style={[styles.row, selected && styles.selectedRow]}
            onPress={() => void detail.vote(option.id)}
            disabled={disabled}
            accessibilityRole='radio'
            accessibilityState={{ selected, disabled }}
          >
            {showResults && ratio > 0 && (
              <View
                style={[
                  styles.progress,
                  selected ? styles.selectedProgress : styles.otherProgress,
                  { width: `${ratio}%` },
                ]}
              />
            )}
            <PretendardText style={[styles.text, selected && styles.selectedText]}>
              {option.text}
            </PretendardText>
            {showResults && (
              <PretendardText style={[styles.count, selected && styles.selectedText]}>
                {`${option.voteCount} · ${ratio}%${selected ? ' ✓' : ''}`}
              </PretendardText>
            )}
          </Pressable>
        );
      })}
      <PretendardText style={styles.meta}>
        {expired
          ? app.getL10n().t('community.poll.closed')
          : poll.expiresAt
            ? app.getL10n().t('community.poll.closesAt', {
                date: formatCommunityDate(poll.expiresAt),
              })
            : null}
      </PretendardText>
      <PretendardText style={styles.meta}>
        {app.getL10n().t('community.poll.participants', {
          count: poll.totalVoteCount,
        })}
      </PretendardText>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { marginTop: 24 },
  row: {
    minHeight: 44,
    paddingHorizontal: 12,
    marginBottom: 8,
    justifyContent: 'center',
    borderRadius: AcgRadius.thumb,
    overflow: 'hidden',
    backgroundColor: Acg.controlFill,
  },
  selectedRow: { backgroundColor: Acg.ink },
  progress: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    height: 4,
  },
  selectedProgress: { backgroundColor: Acg.paper },
  otherProgress: { backgroundColor: Acg.ink },
  text: { ...AcgType.control, color: Acg.ink },
  count: { ...AcgType.meta, color: Acg.ink, position: 'absolute', right: 12 },
  selectedText: { color: Acg.paper },
  meta: { ...AcgType.meta, color: Acg.textMuted, marginTop: 4 },
});

export default CommunityDetailPollView;
