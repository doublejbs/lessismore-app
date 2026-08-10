import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import LiquidCard from '@/components/liquid/LiquidCard';
import {
  Liquid,
  LiquidLayout,
  LiquidMotion,
  LiquidRadius,
  LiquidSemantic,
  LiquidType,
} from '@/constants/DesignTokens';
import Comment from '@/model/reply/Comment';
import ReplyDetail from '@/model/reply/ReplyDetail';
import dayjs from 'dayjs';
import { FC, useState } from 'react';
import { observer } from 'mobx-react-lite';
import app from '@/model/app/App';
import BottomMenuModalView from '../ui/BottomMenuModalView';
import StarRatingView from '../camp-site/StarRatingView';
import { useRouter } from 'expo-router';

interface Props {
  comment: Comment;
  replyDetail: ReplyDetail;
}

/**
 * 좋아요 버튼 터치 여유. 아이콘 20 + 숫자를 여백 없는 행에 놓아 시각 높이가 20이다 — 키우면
 * 카드 안에서 하트가 본문보다 무거워 보이므로 여유로만 44pt를 채운다: (44 − 20) / 2 = 12.
 */
const LIKE_HIT_SLOP = { top: 12, bottom: 12, left: 8, right: 8 };

/**
 * RP-2 리뷰 상세의 원 리뷰 카드 (Liquid Depth, 2026-08-11 이식).
 *
 * 이 화면의 주인공이라 **자기 종이 카드**를 갖는다(답글 묶음은 아래 들여쓴 카드 하나).
 * 별점을 함께 보여 목록(RP-6)과 같은 사실을 말한다 — 목록에서 별점을 보고 들어왔는데
 * 상세에 없으면 다른 리뷰처럼 읽힌다.
 */
const ReplyDetailOriginalView: FC<Props> = ({ comment, replyDetail }) => {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const isLiked = replyDetail.isCommentLiked(comment.id);
  const currentUserId = app.getFirebase().getUserId();
  const isMyComment = comment.authorId === currentUserId;

  const handleLikePress = () => {
    app.getAnalyticsManager()?.logClick('reply_like', { liked: !isLiked });
    replyDetail.toggleLike(comment.id);
  };

  const handlePressMore = () => {
    setShowMenu(true);
  };

  const handleCloseMenu = () => {
    setShowMenu(false);
  };

  const handlePressEdit = () => {
    setShowMenu(false);
    router.push(`/reply/${replyDetail.getGearId()}/${comment.id}/edit`);
  };

  const handlePressDelete = () => {
    setShowMenu(false);
    replyDetail.showDeleteConfirm(comment.id);
  };

  const menuItems = [
    {
      icon: 'pencil' as const,
      text: '수정하기',
      onPress: handlePressEdit,
    },
    {
      icon: 'trash-outline' as const,
      text: '삭제하기',
      onPress: handlePressDelete,
    },
  ];

  return (
    <>
      <LiquidCard
        tone='paper'
        padding={LiquidLayout.cardPad}
        style={styles.card}
      >
        <View style={styles.header}>
          <View style={styles.authorRow}>
            <PretendardText weight='semibold' style={styles.name}>
              {comment.authorName}
            </PretendardText>
            {isMyComment ? (
              <View style={styles.mineBadge}>
                <PretendardText weight='medium' style={styles.mineBadgeText}>
                  내 리뷰
                </PretendardText>
              </View>
            ) : null}
          </View>
          <View style={styles.headerTrailing}>
            <PretendardText style={styles.date}>
              {dayjs(comment.createdAt).format('YYYY.MM.DD')}
            </PretendardText>
            {isMyComment ? (
              <TouchableOpacity
                style={styles.moreButton}
                onPress={handlePressMore}
                activeOpacity={LiquidMotion.pressOpacity}
                accessibilityRole='button'
                accessibilityLabel='내 리뷰 더보기'
              >
                <Ionicons
                  name='ellipsis-horizontal'
                  size={16}
                  color={Liquid.inkSubtle}
                />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {comment.rating !== undefined && (
          <StarRatingView rating={comment.rating} size={14} />
        )}

        <PretendardText style={styles.content}>
          {comment.content}
        </PretendardText>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.iconWithText}
            onPress={handleLikePress}
            activeOpacity={LiquidMotion.pressOpacity}
            hitSlop={LIKE_HIT_SLOP}
            accessibilityRole='button'
            accessibilityLabel={isLiked ? '좋아요 취소' : '좋아요'}
            accessibilityState={{ selected: isLiked }}
          >
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={20}
              color={isLiked ? LiquidSemantic.like : Liquid.inkMuted}
            />
            <PretendardText
              style={[styles.count, isLiked && styles.countActive]}
            >
              {comment.likeCount}
            </PretendardText>
          </TouchableOpacity>
          <View style={styles.iconWithText}>
            <Ionicons
              name='chatbubble-outline'
              size={20}
              color={Liquid.inkMuted}
            />
            <PretendardText style={styles.count}>
              {comment.replyCount}
            </PretendardText>
          </View>
        </View>
      </LiquidCard>

      <BottomMenuModalView
        visible={showMenu}
        onClose={handleCloseMenu}
        menuItems={menuItems}
      />
    </>
  );
};

const styles = StyleSheet.create({
  // 카드 면·그림자·모서리는 `LiquidCard`가 든다 — 여기서는 안쪽 줄 간격만 정한다.
  card: {
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  authorRow: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 14,
    color: Liquid.ink,
  },
  mineBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: LiquidRadius.pill,
    backgroundColor: Liquid.badgeFill,
  },
  mineBadgeText: {
    fontSize: 11,
    color: Liquid.inkSecondary,
  },
  headerTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  date: {
    fontSize: LiquidType.caption.fontSize,
    lineHeight: LiquidType.caption.lineHeight,
    color: Liquid.inkMuted,
  },
  // 아이콘은 16pt지만 HIG 최소 터치 타깃 44pt를 확보한다.
  moreButton: {
    width: LiquidLayout.touchMin,
    height: LiquidLayout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -10,
  },
  content: {
    fontSize: LiquidType.body.fontSize,
    lineHeight: 22,
    color: Liquid.inkSecondary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  iconWithText: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  count: {
    fontSize: 13,
    color: Liquid.inkMuted,
  },
  countActive: {
    color: LiquidSemantic.like,
  },
});

export default observer(ReplyDetailOriginalView);
