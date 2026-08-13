import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgRadius, AcgType } from '@/constants/DesignTokens';
import Comment from '@/model/reply/Comment';
import dayjs from 'dayjs';
import { FC, useRef, useState } from 'react';
import ReplyDetail from '@/model/reply/ReplyDetail';
import { observer } from 'mobx-react-lite';
import app from '@/model/app/App';
import BottomMenuModalView from '../ui/BottomMenuModalView';
import { useRouter } from 'expo-router';

interface Props {
  comment: Comment;
  replyDetail: ReplyDetail;
}

// 좋아요 빨강은 의미색이라 ACG 액센트(라임)로 바꾸지 않는다.
const LIKED_COLOR = '#FF6B6B';

const ReplyDetailCommentView: FC<Props> = ({ comment, replyDetail }) => {
  const ref = useRef<View>(null);
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
      <View style={styles.container} ref={ref}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <PretendardText weight='semibold' style={styles.name}>
                {comment.authorName}
              </PretendardText>
              {/* RP-7: 내 답글은 메타 줄의 조각으로 밝힌다(라임 글자를 쓰지 않는다). */}
              <PretendardText style={styles.date}>
                {dayjs(comment.createdAt).format('YYYY. M. D')}
                {isMyComment ? ' · 내 답글' : ''}
              </PretendardText>
            </View>
            {isMyComment && (
              <TouchableOpacity
                onPress={handlePressMore}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole='button'
                accessibilityLabel='답글 관리'
              >
                <Ionicons
                  name='ellipsis-horizontal'
                  size={16}
                  color={Acg.textMuted}
                />
              </TouchableOpacity>
            )}
          </View>
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
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole='button'
              accessibilityLabel={isLiked ? '좋아요 취소' : '좋아요'}
              accessibilityState={{ selected: isLiked }}
            >
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={18}
                color={isLiked ? LIKED_COLOR : Acg.textMuted}
              />
              <PretendardText
                style={[styles.likeCount, isLiked && styles.likeCountActive]}
              >
                {comment.likeCount}
              </PretendardText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handlePressReply}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole='button'
            >
              <PretendardText style={styles.replyButton}>
                답글달기
              </PretendardText>
            </TouchableOpacity>
          </View>
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
  // RP-7: 원 리뷰와 같은 연회색 면 + 모서리 12이되, 좌측을 들여 답글임을 드러낸다.
  container: {
    flexDirection: 'column',
    backgroundColor: Acg.controlFill,
    borderRadius: AcgRadius.thumb,
    marginLeft: 20,
  },
  content: {
    paddingVertical: 16,
    paddingHorizontal: 14,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
    gap: 4,
  },
  name: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
  date: {
    ...AcgType.meta,
    color: Acg.textMuted,
  },
  // 여러 줄 문단이라 `body`(14/21)다 — 옛 `sectionSubtitle`(15)은 한 줄 부제 단이었다.
  commentText: {
    ...AcgType.body,
    color: Acg.ink,
  },
  // RP-7: @멘션은 색이 아니라 굵기로 가른다(라임을 글자색으로 쓰지 않는다).
  mention: {
    ...AcgType.body,
    color: Acg.ink,
  },
  replyButton: {
    ...AcgType.control,
    color: Acg.textMuted,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
  },
  iconWithText: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  likeCount: {
    ...AcgType.rowSubtitle,
    color: Acg.textMuted,
  },
  likeCountActive: {
    color: LIKED_COLOR,
  },
});

export default observer(ReplyDetailCommentView);
