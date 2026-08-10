import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import WarehouseDetail from '../../model/warehouse-detail/WarehouseDetail';
import ReviewSectionView from '../review/ReviewSectionView';
import WarehouseDetailSectionView from './WarehouseDetailSectionView';
import { BlogReview, VideoReview } from '@/model/review/ReviewTypes';

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
    // 앱 내 사용자 `리뷰` 섹션과 구분되는 타이틀. 공용 후기 모듈(박지 상세와 공유)이 자기
    // 행·카드를 직접 그리므로 섹션은 면을 두지 않는다(`list`) — 영상 가로 스크롤의
    // 풀블리드(-20)도 이때만 화면 좌우 정렬선과 맞는다.
    <WarehouseDetailSectionView title='블로그·유튜브 후기' variant='list'>
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
