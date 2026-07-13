import { FC } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';
import StarRatingView from './StarRatingView';
import { CampReview } from '@/model/camp-review/CampReviewTypes';

interface Props {
  review: CampReview;
  isMine: boolean;
  onPressBag: (bagId: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

// 유저 후기 단건 카드(CS-8) — 순수 표시 컴포넌트.
// 작성자·별점·글·첨부 배낭을 보여주고, 내 후기면 수정/삭제 액션을 노출한다.
const CampUserReviewItemView: FC<Props> = ({
  review,
  isMine,
  onPressBag,
  onEdit,
  onDelete,
}) => {
  const dateLabel = dayjs(review.updatedAt).format('YYYY.MM.DD');

  const handlePressBag = () => {
    if (!review.bagId) {
      return;
    }

    onPressBag(review.bagId);
  };

  const handlePressDelete = () => {
    Alert.alert('후기 삭제', '내 후기를 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: onDelete },
    ]);
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.authorRow}>
          <PretendardText style={styles.author} weight='semibold'>
            {review.authorName}
          </PretendardText>
          {isMine ? (
            <View style={styles.mineBadge}>
              <PretendardText style={styles.mineBadgeText} weight='medium'>
                내 후기
              </PretendardText>
            </View>
          ) : null}
        </View>
        <PretendardText style={styles.date}>{dateLabel}</PretendardText>
      </View>

      <StarRatingView rating={review.rating} size={14} />

      {review.content ? (
        <PretendardText style={styles.content}>{review.content}</PretendardText>
      ) : null}

      {review.bagId ? (
        <TouchableOpacity
          style={styles.bagChip}
          onPress={handlePressBag}
          activeOpacity={0.7}
          accessibilityRole='button'
          accessibilityLabel={`배낭 ${review.bagName ?? ''} 열기`}
        >
          <Ionicons
            name='briefcase-outline'
            size={14}
            color={Color.textSecondary}
          />
          <PretendardText style={styles.bagName} weight='medium'>
            {review.bagName ?? '배낭'}
          </PretendardText>
          {review.bagDate ? (
            <PretendardText style={styles.bagMeta}>
              {review.bagDate}
            </PretendardText>
          ) : null}
          {review.bagWeight ? (
            <PretendardText style={styles.bagMeta}>
              {review.bagWeight}kg
            </PretendardText>
          ) : null}
        </TouchableOpacity>
      ) : null}

      {isMine && (onEdit || onDelete) ? (
        <View style={styles.actionRow}>
          {onEdit ? (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onEdit}
              activeOpacity={0.7}
              accessibilityRole='button'
              accessibilityLabel='후기 수정'
            >
              <PretendardText style={styles.actionText} weight='medium'>
                수정
              </PretendardText>
            </TouchableOpacity>
          ) : null}
          {onDelete ? (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handlePressDelete}
              activeOpacity={0.7}
              accessibilityRole='button'
              accessibilityLabel='후기 삭제'
            >
              <PretendardText style={styles.actionText} weight='medium'>
                삭제
              </PretendardText>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: 8,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Color.borderLight,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  authorRow: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  author: {
    fontSize: 14,
    color: Color.textPrimary,
  },
  mineBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.chip,
    backgroundColor: Color.chipInactiveBg,
  },
  mineBadgeText: {
    fontSize: 11,
    color: Color.textTertiary,
  },
  date: {
    fontSize: 12,
    color: Color.textSecondary,
  },
  content: {
    fontSize: 14,
    lineHeight: 22,
    color: Color.textPrimary,
  },
  bagChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: Radius.chip,
    backgroundColor: Color.chipInactiveBg,
  },
  bagName: {
    fontSize: 13,
    color: Color.textPrimary,
  },
  bagMeta: {
    fontSize: 12,
    color: Color.textSecondary,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 4,
  },
  actionButton: {
    minHeight: 44,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 13,
    color: Color.textSecondary,
  },
});

export default CampUserReviewItemView;
