import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { Color } from '@/constants/DesignTokens';
import Comment from '@/model/reply/Comment';
import Reply from '@/model/reply/Reply';
import dayjs from 'dayjs';
import { useRouter } from 'expo-router';
import { FC, useState } from 'react';
import { observer } from 'mobx-react-lite';
import app from '@/model/app/App';
import BottomMenuModalView from '../ui/BottomMenuModalView';

interface Props {
  gearId: string;
  comment: Comment;
  reply: Reply;
}

const ReplyItemView: FC<Props> = ({ gearId, comment, reply }) => {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const isLiked = reply.isCommentLiked(comment.id);
  const currentUserId = app.getFirebase().getUserId();
  const isMyComment = comment.authorId === currentUserId;

  const handlePress = () => {
    router.push(`/reply/${gearId}/${comment.id}`);
  };

  const handleLikePress = (e: any) => {
    e.stopPropagation();
    app.getAnalyticsManager()?.logClick('reply_like', { liked: !isLiked });
    reply.toggleLike(comment.id);
  };

  const handlePressMore = (e: any) => {
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
        style={styles.container}
        activeOpacity={0.7}
        onPress={handlePress}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <PretendardText
              weight='semibold'
              style={[styles.name, isMyComment && { color: '#9CCC65' }]}
            >
              {comment.authorName}
            </PretendardText>
            <PretendardText style={styles.date}>
              {dayjs(comment.createdAt).format('YYYY.MM.DD')}
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
                color={Color.iconMuted}
              />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.contentContainer}>
          <PretendardText style={styles.content}>
            {comment.content}
          </PretendardText>
          <View style={styles.likeCountContainer}>
            <TouchableOpacity
              style={styles.iconWithText}
              onPress={handleLikePress}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={20}
                color={isLiked ? '#FF6B6B' : Color.textTertiary}
              />
              <PretendardText
                style={[styles.likeCount, isLiked && { color: '#FF6B6B' }]}
              >
                {comment.likeCount}
              </PretendardText>
            </TouchableOpacity>
            <View style={styles.iconWithText}>
              <Ionicons
                name='chatbubble-outline'
                size={20}
                color={Color.textTertiary}
              />
              <PretendardText style={styles.replyCount}>
                {comment.replyCount}
              </PretendardText>
            </View>
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
  container: {
    flexDirection: 'column',
    gap: 12,
    borderTopWidth: 3,
    borderTopColor: Color.divider,
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'column',
    gap: 4,
  },
  name: {
    fontSize: 14,
  },
  date: {
    fontSize: 12,
    color: Color.textTertiary,
  },
  moreButton: {
    opacity: 0.3,
  },
  likeCountContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  iconWithText: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contentContainer: {
    flexDirection: 'column',
    gap: 12,
  },
  content: {
    fontSize: 17,
  },
  likeCount: {
    fontSize: 16,
    color: Color.textTertiary,
  },
  replyCount: {
    fontSize: 16,
    color: Color.textTertiary,
  },
});

export default observer(ReplyItemView);
