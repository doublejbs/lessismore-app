import { FC, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import BottomMenuModalView from '@/components/ui/BottomMenuModalView';
import { AcgType, Color, Radius } from '@/constants/DesignTokens';
import StarRatingView from './StarRatingView';
import { CampReview } from '@/model/camp-review/CampReviewTypes';
import app from '@/model/app/App';

interface Props {
  review: CampReview;
  isMine: boolean;
  onPressBag: (bagId: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

/**
 * 유저 후기 단건 카드(CS-8).
 *
 * 내 후기면 헤더 우측에 `⋯`를 두고 수정·삭제를 바텀 메뉴로 낸다 — 장비 리뷰
 * (`ReplyItemView`)가 쓰는 앱 공용 패턴이다.
 *
 * 예전에는 카드 하단에 `수정`/`삭제` 텍스트 버튼을 우측 정렬로 뒀는데(2026-08-03 리뷰),
 * 카드에 배경·테두리가 없어 **다음 후기 작성자 이름 바로 위**에 놓였다. 내 후기가 최상단
 * 고정이라 항상 남의 후기와 맞닿았고, 파괴적 액션의 대상이 모호했다. 빨간 `삭제`가 카드에서
 * 가장 먼저 눈에 들어와 하단 주 CTA와 시선을 다투기도 했다.
 */
const CampUserReviewItemView: FC<Props> = ({
  review,
  isMine,
  onPressBag,
  onEdit,
  onDelete,
}) => {
  const l10n = app.getL10n();
  const [showMenu, setShowMenu] = useState(false);
  const dateLabel = dayjs(review.updatedAt).format('YYYY.MM.DD');
  const hasMenu = isMine && Boolean(onEdit || onDelete);

  /**
   * 날짜·무게는 `·`로 잇는다 — 후기 작성 화면의 첨부 배낭 칩과 같은 문법이다.
   * 구분자 없이 나열하면 `2026.07.17 ~ 2026.07.18 1.34kg`이 한 덩어리로 읽힌다.
   */
  const bagMeta = [
    review.bagDate,
    review.bagWeight ? `${review.bagWeight}kg` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  const handlePressBag = () => {
    if (!review.bagId) {
      return;
    }

    onPressBag(review.bagId);
  };

  const handlePressEdit = () => {
    setShowMenu(false);
    onEdit?.();
  };

  const handlePressDelete = () => {
    setShowMenu(false);
    Alert.alert(l10n.t('campSite.review.deleteTitle'), l10n.t('campSite.review.deleteMessage'), [
      { text: l10n.t('common.cancel'), style: 'cancel' },
      { text: l10n.t('common.delete'), style: 'destructive', onPress: onDelete },
    ]);
  };

  const menuItems = [
    ...(onEdit
      ? [
          {
            icon: 'pencil' as const,
            text: l10n.t('campSite.review.edit'),
            onPress: handlePressEdit,
          },
        ]
      : []),
    ...(onDelete
      ? [
          {
            icon: 'trash-outline' as const,
            text: l10n.t('campSite.review.delete'),
            onPress: handlePressDelete,
          },
        ]
      : []),
  ];

  return (
    <>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.authorRow}>
            <PretendardText style={styles.author} weight='semibold'>
              {review.authorName}
            </PretendardText>
            {isMine ? (
              <View style={styles.mineBadge}>
                <PretendardText style={styles.mineBadgeText} weight='medium'>
                  {l10n.t('campSite.review.mine')}
                </PretendardText>
              </View>
            ) : null}
          </View>
          <View style={styles.headerTrailing}>
            <PretendardText style={styles.date}>{dateLabel}</PretendardText>
            {hasMenu ? (
              <TouchableOpacity
                style={styles.moreButton}
                onPress={() => setShowMenu(true)}
                activeOpacity={0.7}
                accessibilityRole='button'
                accessibilityLabel={l10n.t('campSite.review.more')}
              >
                <Ionicons
                  name='ellipsis-horizontal'
                  size={16}
                  color={Color.iconMuted}
                />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <StarRatingView rating={review.rating} size={14} />

        {review.content ? (
          <PretendardText style={styles.content}>
            {review.content}
          </PretendardText>
        ) : null}

        {review.bagId ? (
          <TouchableOpacity
            style={styles.bagChip}
            onPress={handlePressBag}
            activeOpacity={0.7}
            accessibilityRole='button'
            accessibilityLabel={l10n.t('campSite.review.bagOpen', {
              name: review.bagName ?? '',
            })}
            // 시각 높이는 낮추고 터치 타깃 44pt는 hitSlop으로 확보한다(정보 탭 AU-4와 같은 방식).
            hitSlop={{ top: 8, bottom: 8, left: 0, right: 0 }}
          >
            <PretendardText
              style={styles.bagName}
              weight='medium'
              numberOfLines={1}
            >
              {review.bagName ?? l10n.t('campSite.review.bag')}
            </PretendardText>
            {bagMeta ? (
              <PretendardText style={styles.bagMeta} numberOfLines={1}>
                {bagMeta}
              </PretendardText>
            ) : null}
            {/* 탭 가능(읽기전용 배낭 뷰어로 이동)함을 나타내는 chevron. */}
            <Ionicons
              name='chevron-forward'
              size={14}
              color={Color.textSecondary}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      <BottomMenuModalView
        visible={showMenu}
        onClose={() => setShowMenu(false)}
        menuItems={menuItems}
      />
    </>
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
    ...AcgType.rowSubtitle,
    color: Color.textPrimary,
  },
  mineBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.chip,
    backgroundColor: Color.chipInactiveBg,
  },
  mineBadgeText: {
    ...AcgType.meta,
    color: Color.textTertiary,
  },
  date: {
    ...AcgType.meta,
    color: Color.textSecondary,
  },
  content: {
    ...AcgType.body,
    color: Color.textPrimary,
  },
  /**
   * 첨부 배낭 칩. **후기 본문보다 무거우면 안 된다** — 첨부물이 내용을 누른다(2026-08-03 리뷰).
   * 예전에는 `minHeight: 44` + `chipInactiveBg`라 한 줄짜리 후기 글보다 커 보였다.
   * 표면색은 후기 작성 화면의 첨부 칩과 같은 `surfaceMuted`로 맞춘다 — 같은 배낭을
   * 두 화면이 다른 톤으로 그리면 같은 것인지 알아보기 어렵고, `내 후기` 배지와도 구분된다.
   */
  bagChip: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radius.chip,
    backgroundColor: Color.surfaceMuted,
  },
  // 긴 배낭 이름이 날짜·무게·chevron을 밀어내지 않게 이름만 줄인다(2026-08-03 리뷰).
  bagName: {
    ...AcgType.meta,
    flexShrink: 1,
    color: Color.textPrimary,
  },
  bagMeta: {
    ...AcgType.meta,
    flexShrink: 1,
    color: Color.textSecondary,
  },
  headerTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  // 아이콘은 16pt지만 HIG 최소 터치 타깃 44pt를 확보한다(ReplyItemView와 동일).
  moreButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -10,
  },
});

export default observer(CampUserReviewItemView);
