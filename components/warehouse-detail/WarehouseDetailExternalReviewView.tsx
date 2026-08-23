import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import WarehouseDetail from '../../model/warehouse-detail/WarehouseDetail';
import ReviewSectionView from '../review/ReviewSectionView';
import WarehouseDetailSectionView from './WarehouseDetailSectionView';
import { BlogReview, VideoReview } from '@/model/review/ReviewTypes';
import app from '@/model/app/App';

interface Props {
  warehouseDetail: WarehouseDetail;
}

// 장비 외부 후기 섹션(GD-6) — 공용 후기 섹션(유튜브 카드 + 네이버 블로그 리스트)을
// 이 화면의 섹션 껍데기로 감싼다. 둘 다 0건이면 통째로 생략.
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
    // 앱 내 사용자 `리뷰` 섹션과 구분되는 타이틀.
    // 면 없이 흰 지면에 그대로 둔다(2026-08-13 사용자 결정) — 박지 상세 후기와 같은 문법.
    // 카드·리스트가 이미 자체 썸네일 면을 가져, 회색 면으로 감싸면 면 안의 면이 된다.
    <WarehouseDetailSectionView
      title={app.getL10n().t('gearDetail.blogReviews')}
      variant='list'
    >
      <ReviewSectionView
        reviews={reviews}
        videos={videos}
        onPressReview={handlePressReview}
        onPressVideo={handlePressVideo}
      />
    </WarehouseDetailSectionView>
  );
};

export default observer(WarehouseDetailExternalReviewView);
