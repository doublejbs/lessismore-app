import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
        <View style={styles.divider} />
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={[styles.name, isMyComment && { color: '#9CCC65' }]}>
                {comment.authorName}
              </Text>
              <Text style={styles.date}>
                {dayjs(comment.createdAt).format('YYYY. M. D')}
              </Text>
            </View>
            {isMyComment && (
              <TouchableOpacity
                style={styles.moreButton}
                onPress={handlePressMore}
              >
                <Ionicons
                  name='ellipsis-horizontal'
                  size={16}
                  color='#9BA2AD'
                />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.commentText}>
            {comment.mentionedUserName && (
              <Text style={styles.mention}>@{comment.mentionedUserName} </Text>
            )}
            {comment.content}
          </Text>
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.iconWithText}
              onPress={handleLikePress}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={18}
                color={isLiked ? '#FF6B6B' : '#9BA2AD'}
              />
              <Text style={[styles.likeCount, isLiked && { color: '#FF6B6B' }]}>
                {comment.likeCount}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handlePressReply} activeOpacity={0.7}>
              <Text style={styles.replyButton}>답글달기</Text>
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
  container: {
    flexDirection: 'column',
  },
  divider: {
    height: 1.83,
    backgroundColor: '#F2F4F6',
  },
  content: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    paddingLeft: 42,
    gap: 12,
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
    fontWeight: '700',
    color: '#333D4B',
  },
  date: {
    fontSize: 12,
    color: '#9BA2AD',
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 4,
  },
  tag: {
    backgroundColor: '#D9D9D9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#242424',
  },
  moreButton: {
    opacity: 0.3,
  },
  commentText: {
    fontSize: 17,
    color: '#000000',
    lineHeight: 20.28,
  },
  mention: {
    fontSize: 17,
    color: '#9CCC65',
    fontWeight: '600',
    lineHeight: 20.28,
  },
  replyButton: {
    fontSize: 14,
    color: '#9BA2AD',
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
    color: '#9BA2AD',
  },
});

export default observer(ReplyDetailCommentView);
