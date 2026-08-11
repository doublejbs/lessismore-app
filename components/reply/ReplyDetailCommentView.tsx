import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { Acg } from '@/constants/DesignTokens';
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
              <PretendardText
                weight='bold'
                style={[styles.name, isMyComment && styles.myName]}
              >
                {comment.authorName}
              </PretendardText>
              <PretendardText style={styles.date}>
                {dayjs(comment.createdAt).format('YYYY. M. D')}
              </PretendardText>
            </View>
            {isMyComment && (
              <TouchableOpacity
                style={styles.moreButton}
                onPress={handlePressMore}
              >
                <Ionicons
                  name='ellipsis-horizontal'
                  size={16}
                  color={Acg.textSecondary}
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
            >
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={18}
                color={isLiked ? LIKED_COLOR : Acg.textSecondary}
              />
              <PretendardText
                style={[styles.likeCount, isLiked && styles.likeCountActive]}
              >
                {comment.likeCount}
              </PretendardText>
            </TouchableOpacity>
            <TouchableOpacity onPress={handlePressReply} activeOpacity={0.7}>
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
  // 원 리뷰와 같은 종이 면이되 좌측을 들여 답글임을 드러낸다(ACG).
  container: {
    flexDirection: 'column',
    backgroundColor: Acg.controlFill,
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
    fontSize: 14,
    color: Acg.ink,
  },
  // 내 답글 표시 — 앱의 단 하나뿐인 액센트(라임)를 쓴다.
  myName: {
    color: Acg.limeText,
  },
  date: {
    fontSize: 12,
    color: Acg.textSecondary,
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 4,
  },
  tag: {
    backgroundColor: Acg.line2,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 0,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
    color: Acg.ink,
  },
  moreButton: {
    opacity: 0.3,
  },
  commentText: {
    fontSize: 15,
    color: Acg.ink,
    lineHeight: 21,
  },
  mention: {
    fontSize: 15,
    color: Acg.limeText,
    lineHeight: 21,
  },
  replyButton: {
    fontSize: 14,
    color: Acg.textSecondary,
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
    fontSize: 14,
    color: Acg.textSecondary,
  },
  likeCountActive: {
    color: LIKED_COLOR,
  },
});

export default observer(ReplyDetailCommentView);
