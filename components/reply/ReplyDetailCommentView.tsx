import { View, StyleSheet, TouchableOpacity } from 'react-native';
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
import dayjs from 'dayjs';
import { FC, useState } from 'react';
import ReplyDetail from '@/model/reply/ReplyDetail';
import { observer } from 'mobx-react-lite';
import app from '@/model/app/App';
import BottomMenuModalView from '../ui/BottomMenuModalView';
import { useRouter } from 'expo-router';

interface Props {
  comment: Comment;
  replyDetail: ReplyDetail;
  /** 카드 안 두 번째 답글부터 위에 헤어라인을 둔다 */
  divider?: boolean;
}

/**
 * 좋아요 버튼 터치 여유. 아이콘 18 + 숫자라 시각 높이가 20 남짓이다 — 키우면 답글 안에서
 * 하트가 본문보다 무거워 보이므로 여유로만 44pt를 채운다.
 */
const LIKE_HIT_SLOP = { top: 12, bottom: 12, left: 8, right: 8 };

/**
 * RP-2 답글 한 항목 (Liquid Depth, 2026-08-11 이식).
 *
 * 항목마다 면을 두지 않는다 — 답글 묶음 전체가 흰 카드 하나이고 항목은 헤어라인으로만
 * 갈린다(카드와 좌측 들여쓰기는 `ReplyDetailView`가 그린다). @멘션은 밝은 면 위 라임 계열
 * 잉크(`limeInk`)로 세운다 — 라임 원색을 글자색으로 쓰지 않는다.
 */
const ReplyDetailCommentView: FC<Props> = ({
  comment,
  replyDetail,
  divider = false,
}) => {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const isLiked = replyDetail.isCommentLiked(comment.id);
  const currentUserId = app.getFirebase().getUserId();
  const isMyComment = comment.authorId === currentUserId;

  const handlePressReply = () => {
    replyDetail.setReplyTarget(comment);
  };

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
      <View style={styles.item}>
        {divider ? <View style={styles.divider} /> : null}
        <View style={styles.header}>
          <View style={styles.authorRow}>
            <PretendardText weight='semibold' style={styles.name}>
              {comment.authorName}
            </PretendardText>
            {isMyComment ? (
              <View style={styles.mineBadge}>
                <PretendardText weight='medium' style={styles.mineBadgeText}>
                  내 답글
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
                accessibilityLabel='내 답글 더보기'
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

        {/* 멘션과 본문이 한 라인박스에 흐르도록 중첩 텍스트로 둔다 — 줄바꿈이 멘션 뒤에서
            끊기지 않아야 `@닉네임 답글 내용`이 한 문장으로 읽힌다. */}
        <PretendardText style={styles.commentText}>
          {comment.mentionedUserName && (
            <PretendardText weight='semibold' style={styles.mention}>
              @{comment.mentionedUserName}{' '}
            </PretendardText>
          )}
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
          <TouchableOpacity
            style={styles.replyButton}
            onPress={handlePressReply}
            activeOpacity={LiquidMotion.pressOpacity}
            accessibilityRole='button'
            accessibilityLabel={`${comment.authorName}에게 답글달기`}
          >
            <PretendardText weight='medium' style={styles.replyButtonText}>
              답글달기
            </PretendardText>
          </TouchableOpacity>
        </View>
      </View>

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
  // 아이콘은 16pt지만 HIG 최소 터치 타깃 44pt를 확보한다.
  moreButton: {
    width: LiquidLayout.touchMin,
    height: LiquidLayout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -10,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 22,
    color: Liquid.inkSecondary,
  },
  // 중첩 텍스트라 lineHeight를 본문과 같게 잡아 라인박스가 어긋나지 않게 한다.
  mention: {
    fontSize: 14,
    lineHeight: 22,
    color: Liquid.limeInk,
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
  // 시각 높이는 낮추고 터치 타깃은 세로 여유로 채운다 — 답글 줄이 본문보다 무거워지지 않게.
  replyButton: {
    paddingVertical: 12,
    marginVertical: -12,
  },
  replyButtonText: {
    fontSize: 13,
    color: Liquid.inkSecondary,
  },
});

export default observer(ReplyDetailCommentView);
