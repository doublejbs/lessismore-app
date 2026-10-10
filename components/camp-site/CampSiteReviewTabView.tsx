import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import { AcgType, Color } from '@/constants/DesignTokens';
import CampUserReviewSectionView from './CampUserReviewSectionView';
import CampSiteTripRecordsSectionView from './CampSiteTripRecordsSectionView';
import ReviewSectionView from '@/components/review/ReviewSectionView';
import CampSiteDetail from '@/model/camp-site/CampSiteDetail';
import { BlogReview, VideoReview } from '@/model/review/ReviewTypes';
import app from '@/model/app/App';

interface Props {
  campSiteDetail: CampSiteDetail;
  // 지도 위 시트로 띄웠는지(CS-3) — 다녀온 기록에서 상세로 갈 때 시트를 교체한다(CS-11).
  inSheet: boolean;
}

const CONTENT_HORIZONTAL_PADDING = 20;

// 상세 시트 '후기' 탭(CS-3/CS-8) — 유저 후기를 먼저 두고 그 아래 외부 블로그·영상을 둔다.
// 바깥 스크롤이 스크롤을 담당하므로 자체 ScrollView 없이 플레인 View로 인라인 렌더한다
// (내부 블로그·영상 카드의 가로 스크롤은 세로 바깥 스크롤과 축이 달라 문제없다).
const CampSiteReviewTabView: FC<Props> = ({ campSiteDetail, inSheet }) => {
  const l10n = app.getL10n();
  const reviews = campSiteDetail.getReviews();
  const videos = campSiteDetail.getVideos();

  const handlePressReview = (review: BlogReview) => {
    void campSiteDetail.openReview(review);
  };

  const handlePressVideo = (video: VideoReview) => {
    void campSiteDetail.openVideo(video);
  };

  return (
    <View style={styles.content}>
      {/* 다녀온 기록(CS-11) — 이용자 후기 위. 0건이면 그리지 않는다. */}
      <CampSiteTripRecordsSectionView
        campSiteDetail={campSiteDetail}
        horizontalPadding={CONTENT_HORIZONTAL_PADDING}
        inSheet={inSheet}
      />
      {/* 유저 후기(CS-8) — 별점 요약·리스트·작성 액션 */}
      <CampUserReviewSectionView campSiteDetail={campSiteDetail} />

      {/* 외부 후기(CS-3) — 공용 후기 콘텐츠(유튜브 카드 + 블로그 리스트) */}
      {reviews.length > 0 || videos.length > 0 ? (
        <View style={styles.section}>
          <PretendardText style={styles.sectionTitle} weight='semibold'>
            {l10n.t('campSite.review.external')}
          </PretendardText>
          <ReviewSectionView
            reviews={reviews}
            videos={videos}
            onPressReview={handlePressReview}
            onPressVideo={handlePressVideo}
          />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: CONTENT_HORIZONTAL_PADDING,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 12,
  },
  section: {
    gap: 8,
    marginTop: 4,
  },
  sectionTitle: {
    ...AcgType.sectionSubtitle,
    color: Color.textPrimary,
  },
});

export default observer(CampSiteReviewTabView);
