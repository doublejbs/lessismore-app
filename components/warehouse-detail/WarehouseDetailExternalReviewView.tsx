import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import WarehouseDetail from '../../model/warehouse-detail/WarehouseDetail';
import SeperaterView from '../ui/SeperaterView';
import ReviewSectionView from '../review/ReviewSectionView';
import PretendardText from '../PretendardText';
import { Color } from '@/constants/DesignTokens';
import { BlogReview, VideoReview } from '@/model/review/ReviewTypes';

interface Props {
  warehouseDetail: WarehouseDetail;
}

// 장비 외부 후기 섹션(GD-6) — 공용 후기 섹션(유튜브 카드 + 네이버 블로그 리스트)을
// 이 화면의 섹션 관례(구분선 + 좌우 20 패딩)로 감싼다. 둘 다 0건이면 통째로 생략.
const WarehouseDetailExternalReviewView: FC<Props> = ({ warehouseDetail }) => {
  const reviews = warehouseDetail.getExternalReviews();
  const videos = warehouseDetail.getExternalVideos();

  if (reviews.length === 0 && videos.length === 0) {
    return null;
  }

  const handlePressReview = (review: BlogReview) => {
    void warehouseDetail.openExternalReview(review);
  };

  const handlePressVideo = (video: VideoReview) => {
    void warehouseDetail.openExternalVideo(video);
  };

  return (
    <>
      <SeperaterView />
      <View style={styles.container}>
        {/* 앱 내 사용자 `리뷰` 섹션과 구분되는 타이틀 — 이 화면의 섹션 타이틀 톤(bold 16). */}
        <PretendardText weight='bold' style={styles.title}>
          블로그·유튜브 후기
        </PretendardText>
        <ReviewSectionView
          reviews={reviews}
          videos={videos}
          onPressReview={handlePressReview}
          onPressVideo={handlePressVideo}
        />
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  title: {
    fontSize: 16,
    color: Color.textPrimary,
  },
});

export default observer(WarehouseDetailExternalReviewView);
