import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgType } from '@/constants/DesignTokens';
import CommunityPost from '@/model/community/CommunityPost';
import CommunityDetail from '@/model/community-detail/CommunityDetail';
import { getCommunityRelativeTime } from '@/model/community/CommunityFormat';
import app from '@/model/app/App';
import CommunityDetailBagSnapshotView from './CommunityDetailBagSnapshotView';
import CommunityDetailBagGearListView from './CommunityDetailBagGearListView';
import CommunityDetailPollView from './CommunityDetailPollView';
import CommunityDetailPostActionsView from './CommunityDetailPostActionsView';

interface Props {
  post: CommunityPost;
  detail: CommunityDetail;
  width: number;
}

const CommunityDetailPostHeaderView = observer(({ post, detail, width }: Props) => {
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = post.getImages().filter(image => !failedImages.includes(image.id));
  const relativeTime = getCommunityRelativeTime(post.getCreatedAt());
  const bagSnapshot = post.getBagSnapshot();

  return (
    <View style={styles.header}>
      <View style={styles.meta}>
        <PretendardText weight='semibold' style={styles.author}>
          {post.getAuthorName()}
        </PretendardText>
        <PretendardText style={styles.time}>
          {relativeTime}
        </PretendardText>
      </View>
      <PretendardText weight='semibold' style={styles.title}>{post.getTitle()}</PretendardText>
      <PretendardText selectable style={styles.body}>{post.getBody()}</PretendardText>
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
              style={[styles.image, { width, height: Math.min(width * (item.height / Math.max(1, item.width)), 420) }]}
              contentFit='contain'
              accessibilityLabel={app.getL10n().t('community.detail.photoLabel', { count: index + 1, total: post.getImages().length })}
              onError={() => setFailedImages(current => current.includes(item.id) ? current : [...current, item.id])}
            />
          )}
          onMomentumScrollEnd={event => {
            if (width > 0) {
              setCurrentImageIndex(Math.round(event.nativeEvent.contentOffset.x / width));
            }
          }}
        />
      )}
      {post.getImages().length > 1 && images.length > 0 && (
        <PretendardText style={styles.indicator}>
          {`${Math.min(currentImageIndex + 1, images.length)}/${post.getImages().length}`}
        </PretendardText>
      )}
      {post.isBagReview() && bagSnapshot ? (
        <>
          <CommunityDetailBagSnapshotView snapshot={bagSnapshot} />
          <CommunityDetailBagGearListView snapshot={bagSnapshot} />
        </>
      ) : null}
      {post.isPoll() && <CommunityDetailPollView post={post} detail={detail} />}
      <CommunityDetailPostActionsView post={post} detail={detail} />
      <PretendardText weight='semibold' style={styles.commentsTitle}>
        {app.getL10n().t('community.detail.commentsTitle', { count: post.getCommentCount() })}
      </PretendardText>
    </View>
  );
});

const styles = StyleSheet.create({
  header: { paddingTop: 12, paddingBottom: 8 },
  meta: { gap: 2 },
  author: { ...AcgType.rowSubtitle, color: Acg.ink },
  time: { ...AcgType.meta, color: Acg.textMuted },
  title: { ...AcgType.sectionTitle, color: Acg.ink, marginTop: 12 },
  body: { ...AcgType.body, color: Acg.ink, marginTop: 16 },
  image: { marginTop: 20, backgroundColor: Acg.controlFill },
  indicator: { ...AcgType.meta, color: Acg.textMuted, textAlign: 'center', marginTop: 8 },
  commentsTitle: { ...AcgType.sectionTitle, color: Acg.ink, marginTop: 20, marginBottom: 4 },
});

export default CommunityDetailPostHeaderView;
