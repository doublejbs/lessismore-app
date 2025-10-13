import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Comment from '@/model/reply/Comment';
import dayjs from 'dayjs';
import { FC } from 'react';
import { observer } from 'mobx-react-lite';

interface Props {
  comment: Comment;
}

const ReplyDetailOriginalView: FC<Props> = ({ comment }) => {
  return (
    <View style={styles.container}>
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
        <Text style={styles.commentText}>{comment.content}</Text>
        <View style={styles.footer}>
          <View style={styles.iconWithText}>
            <Ionicons name='heart-outline' size={20} color='#333D4B' />
            <Text style={styles.count}>{comment.likeCount}</Text>
          </View>
          <View style={styles.iconWithText}>
            <Ionicons name='chatbubble-outline' size={20} color='#333D4B' />
            <Text style={styles.count}>{comment.replyCount}</Text>
          </View>
        </View>
      </View>
      <View style={styles.divider} />
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
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    height: 41,
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
  footer: {
    flexDirection: 'row',
    gap: 24,
    height: 21,
  },
  iconWithText: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  count: {
    fontSize: 17,
    color: '#333D4B',
  },
});

export default observer(ReplyDetailOriginalView);
