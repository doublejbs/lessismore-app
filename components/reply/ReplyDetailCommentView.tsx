import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Comment from '@/model/reply/Comment';
import dayjs from 'dayjs';
import { FC, useRef } from 'react';
import ReplyDetail from '@/model/reply/ReplyDetail';
import { observer } from 'mobx-react-lite';

interface Props {
  comment: Comment;
  replyDetail: ReplyDetail;
}

const ReplyDetailCommentView: FC<Props> = ({ comment, replyDetail }) => {
  const ref = useRef<View>(null);

  const handlePressReply = () => {
    replyDetail.setReplyTarget(comment);
  };

  return (
    <View style={styles.container} ref={ref}>
      <View style={styles.divider} />
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.name}>{comment.authorName}</Text>
            <Text style={styles.date}>
              {dayjs(comment.createdAt).format('YYYY. M. D')}
            </Text>
          </View>
          <TouchableOpacity style={styles.moreButton}>
            <Ionicons name='ellipsis-horizontal' size={16} color='#9BA2AD' />
          </TouchableOpacity>
        </View>
        <Text style={styles.commentText}>
          {comment.mentionedUserName && (
            <Text style={styles.mention}>@{comment.mentionedUserName} </Text>
          )}
          {comment.content}
        </Text>
        <TouchableOpacity onPress={handlePressReply} activeOpacity={0.7}>
          <Text style={styles.replyButton}>답글달기</Text>
        </TouchableOpacity>
      </View>
    </View>
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
    marginTop: 8,
  },
});

export default observer(ReplyDetailCommentView);
