import { FC, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Href, useRouter } from 'expo-router';
import AcgDisplayText from '@/components/acg/AcgDisplayText';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgRadius, AcgType } from '@/constants/DesignTokens';
import {
  formatCommunityWeight,
  getCommunityRelativeTime,
} from '@/model/community/CommunityFormat';
import CommunityPost from '@/model/community/CommunityPost';
import { COMMUNITY_POST_PREVIEW_MAX_LENGTH } from '@/model/community/CommunityLimits';
import app from '@/model/app/App';

interface Props {
  post: CommunityPost;
  onPress?: () => void;
}

const CARD_PADDING = 16;

const CommunityFeedCardView: FC<Props> = ({ post, onPress }) => {
  const router = useRouter();
  const [imageFailed, setImageFailed] = useState(false);
  const image = post.getRepresentativeImage();
  const relativeTime = getCommunityRelativeTime(post.getCreatedAt());
  const l10n = app.getL10n();
  const handlePress = () => {
    if (onPress) {
      onPress();

      return;
    }

    app.getAnalyticsManager()?.logClick('click_community_post', {
      has_packing: post.hasBagSnapshot(),
      has_poll: post.hasPoll(),
    });
    router.push(`/community/${post.getId()}` as Href);
  };
  const renderExtraMeta = () => {
    const snapshot = post.hasBagSnapshot() ? post.getBagSnapshot() : null;
    const poll = post.hasPoll() ? post.getPoll() : null;

    if (!snapshot && !poll) {
      return null;
    }

    const status = poll
      ? post.isPollExpired()
        ? l10n.t('community.feed.pollClosed')
        : l10n.t('community.feed.pollOpen')
      : null;

    return (
      <View style={styles.extraMetaContainer}>
        {snapshot ? (
          <PretendardText style={styles.extraMeta} numberOfLines={1}>
            {l10n.t('community.feed.bagMeta', {
              name: snapshot.name,
              weight: formatCommunityWeight(snapshot.totalWeight),
              count: snapshot.itemCount,
            })}
          </PretendardText>
        ) : null}
        {poll && status ? (
          <PretendardText style={styles.extraMeta} numberOfLines={1}>
            {l10n.t('community.feed.pollMeta', {
              count: poll.options.length,
              votes: poll.totalVoteCount,
              status,
            })}
          </PretendardText>
        ) : null}
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.85}
      accessibilityRole='button'
      accessibilityLabel={`${post.getTitle()}, ${post.getAuthorName()}, ${relativeTime}`}
    >
      {image && !imageFailed ? (
        <Image
          source={{ uri: image.url }}
          style={styles.image}
          contentFit='cover'
          accessible={false}
          onError={() => setImageFailed(true)}
        />
      ) : null}
      <View style={styles.content}>
        <View style={styles.meta}>
          <PretendardText weight='semibold' style={styles.author} numberOfLines={1}>
            {post.getAuthorName()}
          </PretendardText>
          <PretendardText style={styles.time} numberOfLines={1}>
            {relativeTime}
          </PretendardText>
        </View>
        <PretendardText style={styles.title} weight='medium' numberOfLines={2}>
          {post.getTitle()}
        </PretendardText>
        {post.getBodyPreview(COMMUNITY_POST_PREVIEW_MAX_LENGTH) ? (
          <PretendardText style={styles.body} numberOfLines={3}>
          {post.getBodyPreview(COMMUNITY_POST_PREVIEW_MAX_LENGTH)}
          </PretendardText>
        ) : null}
        {renderExtraMeta()}
        <View style={styles.counts}>
          <View style={styles.count}>
            <Ionicons name='heart-outline' size={16} color={Acg.textSecondary} />
            <AcgDisplayText style={styles.countText}>
              {String(post.getLikeCount())}
            </AcgDisplayText>
          </View>
          <View style={styles.count}>
            <Ionicons
              name='chatbubble-outline'
              size={15}
              color={Acg.textSecondary}
            />
            <AcgDisplayText style={styles.countText}>
              {String(post.getCommentCount())}
            </AcgDisplayText>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderRadius: AcgRadius.thumb,
    backgroundColor: Acg.controlFill,
  },
  image: {
    width: '100%',
    height: 160,
  },
  content: {
    gap: 6,
    padding: CARD_PADDING,
  },
  meta: {
    gap: 2,
  },
  author: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
  time: {
    ...AcgType.meta,
    color: Acg.textMuted,
  },
  title: {
    ...AcgType.rowTitle,
    color: Acg.ink,
  },
  body: {
    ...AcgType.rowSubtitle,
    color: Acg.textSecondary,
  },
  extraMeta: {
    ...AcgType.meta,
    color: Acg.ink,
  },
  extraMetaContainer: {
    gap: 2,
  },
  counts: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 2,
  },
  count: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countText: {
    ...AcgType.meta,
  },
});

export default observer(CommunityFeedCardView);
