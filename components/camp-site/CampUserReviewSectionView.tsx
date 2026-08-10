import { FC } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import LiquidSectionLabel from '@/components/liquid/LiquidSectionLabel';
import {
  Liquid,
  LiquidFont,
  LiquidLayout,
  LiquidMotion,
  LiquidRadius,
} from '@/constants/DesignTokens';
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
      {/* 아래 `블로그·영상`과 나란한 제목을 둔다(2026-08-03 리뷰) — 한쪽에만 제목이 있으면
          위 섹션이 제목 없는 덩어리로 뜬다. 탭 이름(`후기`)과 겹치지 않게 `이용자 후기`로 쓴다. */}
      <LiquidSectionLabel>이용자 후기</LiquidSectionLabel>

      {/* 라벨은 자체 하단 여백을 가지므로 본문만 따로 묶어 간격을 준다. */}
      <View style={styles.body}>
        {summary ? (
          <View style={styles.summaryRow}>
            <StarRatingView rating={summary.ratingAvg} size={16} />
            {/* 평점은 숫자라 콘덴스드를 쓴다 — 한글이 섞이지 않는 자리다. */}
            <PretendardText style={styles.summaryAvg}>
              {summary.ratingAvg.toFixed(1)}
            </PretendardText>
            <PretendardText style={styles.summaryCount}>
              후기 {summary.reviewCount}개
            </PretendardText>
          </View>
        ) : null}

        {/* 안내 → 액션 순서라 빈 상태 문구를 작성 버튼보다 위에 둔다(CS-8). */}
        {isEmpty ? (
          <PretendardText style={styles.emptyText}>
            첫 후기를 남겨보세요
          </PretendardText>
        ) : null}

        {/* 내 후기가 없을 때만 작성 버튼 노출 — 있으면 카드의 수정/삭제로 진입(중복 제거). */}
        {!myReview ? (
          <TouchableOpacity
            style={styles.writeButton}
            onPress={handlePressWrite}
            activeOpacity={LiquidMotion.pressOpacity}
            accessibilityRole='button'
            accessibilityLabel='후기 쓰기'
          >
            <PretendardText style={styles.writeButtonText} weight='semibold'>
              후기 쓰기
            </PretendardText>
          </TouchableOpacity>
        ) : null}

        {!isEmpty ? (
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
        ) : null}

        {/* 아래 `블로그·영상`과의 경계. 후기가 하나라도 있으면 마지막 후기 카드의 하단선이
            이미 섹션을 닫으므로 그리지 않는다 — 겹치면 하드라인이 두 줄로 보인다(2026-08-03 리뷰). */}
        {isEmpty ? <View style={styles.divider} /> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginTop: 4,
  },
  body: {
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryAvg: {
    fontFamily: LiquidFont.condensed,
    fontSize: 16,
    color: Liquid.ink,
  },
  summaryCount: {
    fontSize: 12.5,
    color: Liquid.inkMuted,
  },
  // 하단 고정 CTA(배낭 여행지로 설정)와 폭이 같으면 주 액션이 둘로 보인다 —
  // 내용 폭만 쓰는 흰 알약으로 두되 터치 타깃은 44pt를 지킨다(CS-8).
  writeButton: {
    alignSelf: 'flex-start',
    minHeight: LiquidLayout.touchMin,
    paddingHorizontal: 18,
    borderRadius: LiquidRadius.pill,
    backgroundColor: Liquid.surface,
    borderWidth: 0.5,
    borderColor: Liquid.hairlineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  writeButtonText: {
    fontSize: 14,
    color: Liquid.ink,
  },
  emptyText: {
    fontSize: 14,
    color: Liquid.inkTertiary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Liquid.hairline,
    marginTop: 4,
  },
});

export default observer(CampUserReviewSectionView);
