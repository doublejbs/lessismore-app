import { FC } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { observer } from 'mobx-react-lite';
import WarehouseDetail from '../../model/warehouse-detail/WarehouseDetail';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '../PretendardText';
import WarehouseDetailSectionView from './WarehouseDetailSectionView';
import {
  Liquid,
  LiquidFont,
  LiquidLayout,
  LiquidMotion,
  LiquidType,
} from '@/constants/DesignTokens';
import StarRatingView from '../camp-site/StarRatingView';

interface Props {
  warehouseDetail: WarehouseDetail;
}

/**
 * 리뷰(댓글) 미리보기 섹션(GD-3).
 *
 * Liquid Depth에서는 행마다 면을 두지 않고 **흰 카드 하나 안에 행을 쌓는다** —
 * 평점 요약은 섹션 라벨 우측에 붙어 제목과 짝지어 읽힌다.
 */
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
        <StarRatingView rating={ratingAvg} size={13} />
        {/* 숫자는 콘덴스드로 — 한글이 섞이지 않는 값이라 안전하다. */}
        <PretendardText style={styles.ratingAvgText}>
          {ratingAvg.toFixed(1)}
        </PretendardText>
        <PretendardText style={styles.ratingCountText}>
          (리뷰 {ratingCount})
        </PretendardText>
      </View>
    ) : null;

  return (
    <WarehouseDetailSectionView title='리뷰' accessory={ratingSummary}>
      {hasReplies ? (
        <>
          {replies.map((reply, index) => (
            <View key={reply.getID()}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <TouchableOpacity
                style={styles.replyRow}
                onPress={handleAddReviewPress}
                activeOpacity={LiquidMotion.pressOpacity}
                accessibilityRole='button'
              >
                <PretendardText weight='medium' style={styles.replyContent}>
                  {reply.getContent()}
                </PretendardText>
                <PretendardText style={styles.replyDate}>
                  {reply.getCreateDate()}
                </PretendardText>
              </TouchableOpacity>
            </View>
          ))}
          <View style={styles.divider} />
          <TouchableOpacity
            onPress={handleAddReviewPress}
            style={styles.actionRow}
            activeOpacity={LiquidMotion.pressOpacity}
            accessibilityRole='button'
          >
            <PretendardText weight='medium' style={styles.actionText}>
              더 많은 의견 보기
            </PretendardText>
            <Ionicons
              name='chevron-forward'
              size={16}
              color={Liquid.inkSubtle}
            />
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity
          style={styles.actionRow}
          onPress={handleAddReviewPress}
          activeOpacity={LiquidMotion.pressOpacity}
          accessibilityRole='button'
        >
          <PretendardText weight='medium' style={styles.actionText}>
            첫번째 리뷰 남기기
          </PretendardText>
          <Ionicons name='chevron-forward' size={16} color={Liquid.inkSubtle} />
        </TouchableOpacity>
      )}
    </WarehouseDetailSectionView>
  );
};

const styles = StyleSheet.create({
  ratingSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  ratingAvgText: {
    fontFamily: LiquidFont.condensed,
    fontSize: LiquidType.numSm.fontSize,
    lineHeight: LiquidType.numSm.lineHeight,
    letterSpacing: LiquidType.numSm.letterSpacing,
    color: Liquid.ink,
  },
  ratingCountText: {
    fontSize: 12,
    color: Liquid.inkMuted,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Liquid.hairline,
  },
  replyRow: {
    paddingVertical: 13,
    gap: 3,
  },
  replyContent: {
    fontSize: LiquidType.body.fontSize,
    lineHeight: LiquidType.body.lineHeight,
    color: Liquid.ink,
  },
  replyDate: {
    fontSize: 12,
    color: Liquid.inkSubtle,
  },
  // 좌 텍스트 · 우 쉐브론 — 홈의 `전체 보기` 행과 같은 문법. 세로 패딩으로 44pt를 채운다.
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    minHeight: LiquidLayout.touchMin,
    paddingVertical: 12,
  },
  actionText: {
    fontSize: LiquidType.body.fontSize,
    lineHeight: LiquidType.body.lineHeight,
    color: Liquid.inkSecondary,
  },
});

export default observer(WarehouseDetailReviewSectionView);
