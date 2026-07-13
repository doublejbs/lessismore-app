import { FC } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { observer } from 'mobx-react-lite';
import WarehouseDetail from '../../model/warehouse-detail/WarehouseDetail';
import SeperaterView from '../ui/SeperaterView';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '../PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';
import StarRatingView from '../camp-site/StarRatingView';

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

  return (
    <>
      <SeperaterView />
      <View style={styles.container}>
        <View style={styles.header}>
          <PretendardText weight='bold' style={styles.title}>
            리뷰
          </PretendardText>
          {ratingCount > 0 && (
            <View style={styles.ratingSummary}>
              <StarRatingView rating={ratingAvg} size={14} />
              <PretendardText weight='semibold' style={styles.ratingAvgText}>
                {ratingAvg.toFixed(1)}
              </PretendardText>
              <PretendardText style={styles.ratingCountText}>
                (리뷰 {ratingCount})
              </PretendardText>
            </View>
          )}
        </View>
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
                  더 많은 의견 보기
                </PretendardText>
                <Ionicons name='chevron-forward' size={14} color={Color.textPrimary} />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.addReviewButton}
              onPress={handleAddReviewPress}
            >
              <PretendardText style={styles.addReviewButtonText}>
                첫번째 리뷰 남기기
              </PretendardText>
              <Ionicons name='chevron-forward' size={14} color={Color.textPrimary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    color: Color.textPrimary,
  },
  ratingSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingAvgText: {
    fontSize: 14,
    color: Color.textPrimary,
  },
  ratingCountText: {
    fontSize: 12,
    color: Color.textSecondary,
  },
  repliesContainer: {
    flex: 1,
    flexDirection: 'column',
    gap: 12,
    alignItems: 'center',
  },
  addReviewButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    padding: 16,
    paddingHorizontal: 20,
    backgroundColor: Color.inputBg,
    borderRadius: Radius.card,
    width: '100%',
  },
  addReviewButtonText: {
    fontSize: 14,
    color: Color.textPrimary,
  },
  moreReviewButtonText: {
    fontSize: 14,
    color: Color.textPrimary,
  },
  moreReviewButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 20,
    borderRadius: Radius.card,
    width: '100%',
  },
  replyItem: {
    padding: 14,
    paddingHorizontal: 20,
    backgroundColor: Color.inputBg,
    borderRadius: Radius.card,
    width: '100%',
  },
  replyContent: {
    flexDirection: 'column',
  },
  replyName: {
    fontSize: 14,
  },
  replyDate: {
    fontSize: 10,
    color: Color.textTertiary,
  },
});

export default observer(WarehouseDetailReviewSectionView);
