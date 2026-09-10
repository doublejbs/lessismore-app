import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgRadius, AcgType } from '@/constants/DesignTokens';
import CommunityPost from '@/model/community/CommunityPost';
import CommunityDetail from '@/model/community-detail/CommunityDetail';
import app from '@/model/app/App';

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
  const myOptionIds = detail.getMyVoteOptionIds();
  const showResults = post.getAuthorId() === app.getFirebase().getUserId()
    || myOptionIds.length > 0
    || expired;

  return (
    <View style={styles.card}>
      {poll.allowMultiple && (
        <PretendardText style={styles.multipleMeta}>
          {app.getL10n().t('community.poll.multiple')}
        </PretendardText>
      )}
      {poll.options.map(option => {
        const ratio = poll.totalVoteCount
          ? (option.voteCount / poll.totalVoteCount) * 100
          : 0;
        const selected = myOptionIds.includes(option.id);
        const disabled = expired
          || detail.isVoteInProgress();

        return (
          <View
            key={option.id}
            style={[styles.row, disabled && styles.disabledRow, selected && styles.selectedRow]}
          >
            {showResults && ratio > 0 && (
              <View
                style={[
                  styles.fill,
                  selected ? styles.selectedFill : styles.otherFill,
                  { width: `${ratio}%` },
                ]}
              />
            )}
            <Pressable
              style={styles.content}
              onPress={() => void detail.vote(option.id)}
              disabled={disabled}
              accessibilityRole='radio'
              accessibilityState={{ selected, disabled }}
            >
              <PretendardText
                style={[
                  styles.text,
                  showResults && (selected ? styles.selectedText : styles.otherText),
                ]}
                weight={showResults && selected ? 'semibold' : 'regular'}
                numberOfLines={2}
              >
                {option.text}
              </PretendardText>
              {showResults && (
                <View style={styles.percentContainer}>
                  {selected && (
                    <Ionicons name='checkmark' size={16} color={Acg.ink} />
                  )}
                  <PretendardText
                    style={[styles.percent, selected ? styles.selectedText : styles.otherText]}
                    weight={selected ? 'semibold' : 'regular'}
                  >
                    {`${ratio.toFixed(1)}%`}
                  </PretendardText>
                </View>
              )}
            </Pressable>
          </View>
        );
      })}
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
    minHeight: 56,
    marginBottom: 8,
    borderRadius: AcgRadius.thumb,
    borderWidth: 1,
    borderColor: Acg.hairline,
    overflow: 'hidden',
    backgroundColor: Acg.paper,
  },
  content: {
    minHeight: 56,
    paddingHorizontal: 12,
    position: 'relative',
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedRow: { borderColor: Acg.ink },
  disabledRow: { opacity: 0.6 },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  selectedFill: { backgroundColor: Acg.inkTint },
  otherFill: { backgroundColor: Acg.controlFill },
  text: { ...AcgType.control, flex: 1, marginRight: 12 },
  selectedText: { color: Acg.ink },
  otherText: { color: Acg.textMuted },
  percentContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  percent: { ...AcgType.control },
  meta: { ...AcgType.meta, color: Acg.textMuted, marginTop: 4 },
  multipleMeta: { ...AcgType.meta, color: Acg.textMuted, marginBottom: 8 },
});

export default CommunityDetailPollView;
