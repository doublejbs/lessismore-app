import { FC } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import { Color } from '@/constants/DesignTokens';
import CampUserReviewSectionView from './CampUserReviewSectionView';
import ReviewSectionView from '@/components/review/ReviewSectionView';
import CampSiteDetail from '@/model/camp-site/CampSiteDetail';
import { BlogReview, VideoReview } from '@/model/review/ReviewTypes';

interface Props {
  campSiteDetail: CampSiteDetail;
}

// 상세 시트 '후기' 탭(CS-3/CS-8) — 유저 후기를 먼저 두고 그 아래 외부 블로그·영상을 둔다.
const CampSiteReviewTabView: FC<Props> = ({ campSiteDetail }) => {
  const reviews = campSiteDetail.getReviews();
  const videos = campSiteDetail.getVideos();

  const handlePressReview = (review: BlogReview) => {
    void campSiteDetail.openReview(review);
  };

  const handlePressVideo = (video: VideoReview) => {
    void campSiteDetail.openVideo(video);
  };

  return (
    <ScrollView
      style={styles.content}
      contentContainerStyle={styles.contentContainer}
    >
      {/* 유저 후기(CS-8) — 별점 요약·리스트·작성 액션 */}
      <CampUserReviewSectionView campSiteDetail={campSiteDetail} />

      {/* 외부 후기(CS-3) — 공용 후기 콘텐츠(유튜브 카드 + 블로그 리스트) */}
      {reviews.length > 0 || videos.length > 0 ? (
        <View style={styles.section}>
          <PretendardText style={styles.sectionTitle} weight='semibold'>
            블로그·영상
          </PretendardText>
          <ReviewSectionView
            reviews={reviews}
            videos={videos}
            onPressReview={handlePressReview}
            onPressVideo={handlePressVideo}
          />
        </View>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 12,
  },
  section: {
    gap: 8,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    color: Color.textPrimary,
  },
});

export default observer(CampSiteReviewTabView);
