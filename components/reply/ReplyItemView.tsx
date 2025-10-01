import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Comment from '@/model/reply/Comment';
import dayjs from 'dayjs';
import { useRouter } from 'expo-router';
import { FC } from 'react';

interface Props {
  gearId: string;
  comment: Comment;
}

const ReplyItemView: FC<Props> = ({ gearId, comment }) => {
  const router = useRouter();

  const handlePress = () => {
    router.push(`/reply/${gearId}/${comment.id}`);
  };

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.7}
      onPress={handlePress}
    >
      <View style={styles.header}>
        <Text style={styles.name}>{comment.authorName}</Text>
        <Text style={styles.date}>
          {dayjs(comment.createdAt).format('YYYY.MM.DD')}
        </Text>
      </View>
      <View style={styles.contentContainer}>
        <Text style={styles.content}>{comment.content}</Text>
        <View style={styles.likeCountContainer}>
          <View style={styles.iconWithText}>
            <Ionicons name='heart-outline' size={20} color='#757C86' />
            <Text style={styles.likeCount}>{comment.likeCount}</Text>
          </View>
          <View style={styles.iconWithText}>
            <Ionicons name='chatbubble-outline' size={20} color='#757C86' />
            <Text style={styles.replyCount}>{comment.replyCount}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    gap: 12,
    borderTopWidth: 3,
    borderTopColor: '#F2F4F6',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'column',
    gap: 4,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
  },
  date: {
    fontSize: 12,
    color: '#757C86',
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
    color: '#757C86',
  },
  replyCount: {
    fontSize: 16,
    color: '#757C86',
  },
});

export default ReplyItemView;
