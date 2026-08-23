import { FC } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { observer } from 'mobx-react-lite';
import WarehouseDetail from '../../model/warehouse-detail/WarehouseDetail';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '../PretendardText';
import WarehouseDetailSectionView from './WarehouseDetailSectionView';
import { Acg, AcgRadius, AcgType } from '@/constants/DesignTokens';
import StarRatingView from '../camp-site/StarRatingView';
import app from '@/model/app/App';

interface Props {
  warehouseDetail: WarehouseDetail;
}

const WarehouseDetailReviewSectionView: FC<Props> = ({ warehouseDetail }) => {
  const replies = warehouseDetail.getReplies();
  const hasReplies = warehouseDetail.hasReplies();
  const ratingAvg = warehouseDetail.getReviewRatingAvg();
  const ratingCount = warehouseDetail.getReviewRatingCount();

  const handleAddReviewPress = () => {
    warehouseDetail.goToReply();
  };

  const ratingSummary =
    ratingCount > 0 ? (
      <View style={styles.ratingSummary}>
        <StarRatingView rating={ratingAvg} size={14} />
        <PretendardText weight='semibold' style={styles.ratingAvgText}>
          {ratingAvg.toFixed(1)}
        </PretendardText>
        <PretendardText style={styles.ratingCountText}>
          {app.getL10n().t('gearDetail.reviewCount', { count: ratingCount })}
        </PretendardText>
      </View>
    ) : null;

  return (
    <WarehouseDetailSectionView
      title={app.getL10n().t('gearDetail.reviews')}
      accessory={ratingSummary}
      variant='list'
    >
      <View style={styles.repliesContainer}>
        {hasReplies ? (
          <>
            {replies.map(reply => (
              <TouchableOpacity
                key={reply.getID()}
                style={styles.replyItem}
                onPress={handleAddReviewPress}
              >
                <View style={styles.replyContent}>
                  <PretendardText weight='semibold' style={styles.replyName}>
                    {reply.getContent()}
                  </PretendardText>
                  <PretendardText style={styles.replyDate}>
                    {reply.getCreateDate()}
                  </PretendardText>
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={handleAddReviewPress}
              style={styles.moreReviewButton}
            >
              <PretendardText style={styles.moreReviewButtonText}>
                {app.getL10n().t('gearDetail.moreReviews')}
              </PretendardText>
              <Ionicons
                name='chevron-forward'
                size={13}
                color={Acg.textMuted}
              />
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={styles.addReviewButton}
            onPress={handleAddReviewPress}
          >
            <PretendardText style={styles.addReviewButtonText}>
              {app.getL10n().t('gearDetail.firstReview')}
            </PretendardText>
            <Ionicons name='chevron-forward' size={14} color={Acg.ink} />
          </TouchableOpacity>
        )}
      </View>
    </WarehouseDetailSectionView>
  );
};

const styles = StyleSheet.create({
  ratingSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingAvgText: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
  ratingCountText: {
    ...AcgType.meta,
    color: Acg.textMuted,
  },
  repliesContainer: {
    flex: 1,
    flexDirection: 'column',
    gap: 8,
    alignItems: 'center',
  },
  addReviewButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 15,
    paddingHorizontal: 14,
    backgroundColor: Acg.controlFill,
    borderRadius: AcgRadius.thumb,
    width: '100%',
  },
  addReviewButtonText: {
    ...AcgType.control,
    color: Acg.textMuted,
  },
  moreReviewButtonText: {
    ...AcgType.control,
    color: Acg.textMuted,
  },
  // 홈의 `전체 보기` 행과 같은 문법 — 가운데 정렬 대신 좌 텍스트·우 셰브론.
  moreReviewButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 13,
    paddingHorizontal: 14,
    backgroundColor: Acg.controlFill,
    borderRadius: AcgRadius.thumb,
    width: '100%',
  },
  replyItem: {
    paddingVertical: 13,
    paddingHorizontal: 14,
    backgroundColor: Acg.controlFill,
    borderRadius: AcgRadius.thumb,
    width: '100%',
  },
  replyContent: {
    flexDirection: 'column',
  },
  replyName: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
  replyDate: {
    // 스케일 최소 단으로 올림 — 10pt는 가독 한계
    ...AcgType.meta,
    color: Acg.textMuted,
  },
});

export default observer(WarehouseDetailReviewSectionView);
