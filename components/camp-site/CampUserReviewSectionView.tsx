import { FC } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';
import StarRatingView from './StarRatingView';
import CampUserReviewItemView from './CampUserReviewItemView';
import CampSiteDetail from '@/model/camp-site/CampSiteDetail';
import { CampReview } from '@/model/camp-review/CampReviewTypes';

interface Props {
  campSiteDetail: CampSiteDetail;
}

// 유저 후기 섹션(CS-8) — 별점 요약 + 후기 리스트 + 작성 액션.
// 내 후기는 최상단에 고정하고, 나머지는 최신 수정순으로 렌더한다.
const CampUserReviewSectionView: FC<Props> = ({ campSiteDetail }) => {
  const summary = campSiteDetail.getReviewSummary();
  const reviews = campSiteDetail.getUserReviews();
  const myReview = campSiteDetail.getMyReview();
  const myUid = campSiteDetail.getMyUserId();

  const handlePressWrite = () => {
    campSiteDetail.openWriteReview();
  };

  const handlePressBag = (bagId: string) => {
    campSiteDetail.openReviewBag(bagId);
  };

  const handleEditMine = () => {
    campSiteDetail.openWriteReview();
  };

  const handleDeleteMine = () => {
    void campSiteDetail.deleteMyReview();
  };

  // 내 후기가 있으면 최상단 고정 후 나머지에서 내 후기를 제외한다.
  const restReviews: CampReview[] = myReview
    ? reviews.filter(review => review.authorId !== myUid)
    : reviews;

  const isEmpty = !myReview && restReviews.length === 0;

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <PretendardText style={styles.title} weight='semibold'>
          후기
        </PretendardText>
        {summary ? (
          <View style={styles.summaryRow}>
            <StarRatingView rating={summary.ratingAvg} size={16} />
            <PretendardText style={styles.summaryAvg} weight='semibold'>
              {summary.ratingAvg.toFixed(1)}
            </PretendardText>
            <PretendardText style={styles.summaryCount}>
              후기 {summary.reviewCount}개
            </PretendardText>
          </View>
        ) : null}
      </View>

      {/* 내 후기가 없을 때만 작성 버튼 노출 — 있으면 카드의 수정/삭제로 진입(중복 제거). */}
      {!myReview ? (
        <TouchableOpacity
          style={styles.writeButton}
          onPress={handlePressWrite}
          activeOpacity={0.7}
          accessibilityRole='button'
          accessibilityLabel='후기 쓰기'
        >
          <PretendardText style={styles.writeButtonText} weight='semibold'>
            후기 쓰기
          </PretendardText>
        </TouchableOpacity>
      ) : null}

      {isEmpty ? (
        <PretendardText style={styles.emptyText}>
          첫 후기를 남겨보세요
        </PretendardText>
      ) : (
        <View>
          {myReview ? (
            <CampUserReviewItemView
              review={myReview}
              isMine
              onPressBag={handlePressBag}
              onEdit={handleEditMine}
              onDelete={handleDeleteMine}
            />
          ) : null}
          {restReviews.map(review => (
            <CampUserReviewItemView
              key={review.authorId}
              review={review}
              isMine={review.authorId === myUid}
              onPressBag={handlePressBag}
            />
          ))}
        </View>
      )}

      {/* 아래 '블로그·영상' 섹션과 경계를 명확히 하는 구분선(CS-8 디자인 리뷰). */}
      <View style={styles.divider} />
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    gap: 12,
    marginTop: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    fontSize: 15,
    color: Color.textPrimary,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryAvg: {
    fontSize: 14,
    color: Color.textPrimary,
  },
  summaryCount: {
    fontSize: 13,
    color: Color.textSecondary,
  },
  writeButton: {
    borderWidth: 1,
    borderColor: Color.chipBorder,
    borderRadius: Radius.card,
    paddingVertical: 12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  writeButtonText: {
    fontSize: 15,
    color: Color.textPrimary,
  },
  emptyText: {
    paddingVertical: 24,
    fontSize: 14,
    color: Color.textSecondary,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: Color.borderLight,
    marginTop: 4,
  },
});

export default observer(CampUserReviewSectionView);
