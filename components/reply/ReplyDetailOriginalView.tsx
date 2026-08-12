import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgType } from '@/constants/DesignTokens';
import Comment from '@/model/reply/Comment';
import ReplyDetail from '@/model/reply/ReplyDetail';
import dayjs from 'dayjs';
import { FC, useState } from 'react';
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
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <PretendardText weight='bold' style={styles.name}>
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
                  color={Acg.textMuted}
                />
              </TouchableOpacity>
            )}
          </View>
          <PretendardText style={styles.commentText}>
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
                size={20}
                color={isLiked ? LIKED_COLOR : Acg.textMuted}
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
                color={Acg.textMuted}
              />
              <PretendardText style={styles.count}>
                {comment.replyCount}
              </PretendardText>
            </View>
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
  // 지면 위 각진 종이 면(ACG). 위아래 회색 띠로 원 리뷰를 감싸던 방식은 지면이
  // 생기면서 필요 없어졌다 — 면 자체가 경계다.
  container: {
    flexDirection: 'column',
    backgroundColor: Acg.controlFill,
  },
  content: {
    paddingVertical: 16,
    paddingHorizontal: 14,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    minHeight: 41,
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
  tagsContainer: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 4,
  },
  tag: {
    backgroundColor: Acg.hairline,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    ...AcgType.meta,
    fontWeight: '500',
    color: Acg.ink,
  },
  moreButton: {
    opacity: 0.3,
  },
  commentText: {
    ...AcgType.sectionSubtitle,
    color: Acg.ink,
  },
  footer: {
    flexDirection: 'row',
    gap: 24,
    minHeight: 21,
  },
  iconWithText: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  count: {
    ...AcgType.rowSubtitle,
    color: Acg.textMuted,
  },
  countActive: {
    color: LIKED_COLOR,
  },
});

export default observer(ReplyDetailOriginalView);
