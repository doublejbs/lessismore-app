import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgType } from '@/constants/DesignTokens';
import CommunityPost from '@/model/community/CommunityPost';
import CommunityDetail from '@/model/community-detail/CommunityDetail';
import app from '@/model/app/App';

interface Props {
  post: CommunityPost;
  detail: CommunityDetail;
}

const CommunityDetailPostActionsView = observer(({ post, detail }: Props) => {
  return (
    <View style={styles.actions}>
      <TouchableOpacity
        style={styles.likeButton}
        onPress={() => void detail.toggleLike()}
        disabled={detail.isLikeInProgress()}
        accessibilityRole='button'
        accessibilityLabel={app.getL10n().t('community.detail.likeLabel', {
          count: post.getLikeCount(),
        })}
        accessibilityState={{ selected: detail.isLiked(), disabled: detail.isLikeInProgress() }}
      >
        <Ionicons
          name={detail.isLiked() ? 'heart' : 'heart-outline'}
          size={22}
          color={Acg.ink}
        />
        <PretendardText style={styles.count}>{String(post.getLikeCount())}</PretendardText>
      </TouchableOpacity>
      <View style={styles.commentCount}>
        <Ionicons name='chatbubble-outline' size={20} color={Acg.textMuted} />
        <PretendardText style={styles.count}>{String(post.getCommentCount())}</PretendardText>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: AcgLayout.communityActionGap,
    paddingBottom: AcgLayout.communityActionGap,
    borderBottomWidth: 1,
    borderBottomColor: Acg.hairline,
  },
  likeButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', paddingRight: 20 },
  count: { ...AcgType.control, color: Acg.ink, marginLeft: 6 },
  commentCount: { minHeight: 44, flexDirection: 'row', alignItems: 'center' },
});

export default CommunityDetailPostActionsView;
