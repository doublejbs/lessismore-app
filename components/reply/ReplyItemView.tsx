import {
  GestureResponderEvent,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import {
  Liquid,
  LiquidLayout,
  LiquidMotion,
  LiquidRadius,
  LiquidSemantic,
  LiquidType,
} from '@/constants/DesignTokens';
import Comment from '@/model/reply/Comment';
import Reply from '@/model/reply/Reply';
import dayjs from 'dayjs';
import { useRouter } from 'expo-router';
import { FC, useState } from 'react';
import { observer } from 'mobx-react-lite';
import app from '@/model/app/App';
import BottomMenuModalView from '../ui/BottomMenuModalView';
import StarRatingView from '../camp-site/StarRatingView';

interface Props {
  gearId: string;
  comment: Comment;
  reply: Reply;
  /** 카드 안 두 번째 행부터 위에 헤어라인을 둔다 */
  divider?: boolean;
}

/**
 * 좋아요 버튼 터치 여유. 아이콘 18 + 숫자를 여백 없는 행에 놓아 시각 높이가 18이다 — 키우면
 * 항목 안에서 하트가 본문보다 무거워 보이므로 여유로만 44pt를 채운다: (44 − 18) / 2 = 13.
 */
const LIKE_HIT_SLOP = { top: 13, bottom: 13, left: 8, right: 8 };

/**
 * RP-6 리뷰 목록 한 항목 (Liquid Depth, 2026-08-11 이식).
 *
 * 항목마다 면을 두지 않는다 — 목록 전체가 흰 카드 하나이고 항목은 헤어라인으로만 갈린다
 * (카드는 `ReplyView`가 그린다). 내 리뷰는 이름 색을 바꾸는 대신 `내 리뷰` 배지로 표시한다 —
 * 라임을 글자색으로 쓰지 않고, 박지 후기 카드(CS-8)와 같은 표기가 된다.
 */
const ReplyItemView: FC<Props> = ({
  gearId,
  comment,
  reply,
  divider = false,
}) => {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const isLiked = reply.isCommentLiked(comment.id);
  const currentUserId = app.getFirebase().getUserId();
  const isMyComment = comment.authorId === currentUserId;

  const handlePress = () => {
    router.push(`/reply/${gearId}/${comment.id}`);
  };

  const handleLikePress = (e: GestureResponderEvent) => {
    e.stopPropagation();
    app.getAnalyticsManager()?.logClick('reply_like', { liked: !isLiked });
    reply.toggleLike(comment.id);
  };

  const handlePressMore = (e: GestureResponderEvent) => {
    e.stopPropagation();
    setShowMenu(true);
  };

  const handleCloseMenu = () => {
    setShowMenu(false);
  };

  const handlePressEdit = () => {
    setShowMenu(false);
    router.push(`/reply/${gearId}/${comment.id}/edit`);
  };

  const handlePressDelete = () => {
    setShowMenu(false);
    reply.showDeleteConfirm(comment.id);
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
      <TouchableOpacity
        style={styles.item}
        activeOpacity={LiquidMotion.pressOpacity}
        onPress={handlePress}
        accessibilityRole='button'
        accessibilityLabel={`${comment.authorName}의 리뷰, 답글 ${comment.replyCount}개`}
      >
        {divider ? <View style={styles.divider} /> : null}
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
              size={18}
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
              size={18}
              color={Liquid.inkMuted}
            />
            <PretendardText style={styles.count}>
              {comment.replyCount}
            </PretendardText>
          </View>
        </View>
      </TouchableOpacity>

      <BottomMenuModalView
        visible={showMenu}
        onClose={handleCloseMenu}
        menuItems={menuItems}
      />
    </>
  );
};

const styles = StyleSheet.create({
  item: {
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: LiquidLayout.cardPad,
  },
  // 행 위 헤어라인(좌측 16 들여쓰기) — 카드 안에서는 면이 아니라 선이 구획을 맡는다.
  divider: {
    position: 'absolute',
    top: 0,
    left: LiquidLayout.cardPad,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Liquid.hairline,
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
  // 아이콘은 16pt지만 HIG 최소 터치 타깃 44pt를 확보한다(박지 후기 카드와 동일).
  moreButton: {
    width: LiquidLayout.touchMin,
    height: LiquidLayout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -10,
  },
  content: {
    fontSize: 14,
    lineHeight: 22,
    color: Liquid.inkSecondary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
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

export default observer(ReplyItemView);
