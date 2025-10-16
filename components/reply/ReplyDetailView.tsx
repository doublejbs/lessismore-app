import ReplyDetail from '@/model/reply/ReplyDetail';
import { View, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import ReplyDetailOriginalView from './ReplyDetailOriginalView';
import ReplyDetailCommentView from './ReplyDetailCommentView';
import ReplyDetailInputView from './ReplyDetailInputView';
import { useRef } from 'react';

interface Props {
  replyDetail: ReplyDetail;
  originalComment: any;
}

const ReplyDetailView = ({ replyDetail, originalComment }: Props) => {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);

  const handlePressBack = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handlePressBack} activeOpacity={0.7}>
          <Ionicons name='chevron-back-outline' size={24} color='#191F28' />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.scrollView} ref={scrollViewRef}>
        <ReplyDetailOriginalView
          comment={originalComment}
          replyDetail={replyDetail}
        />
        {replyDetail.getReplies().map(reply => (
          <ReplyDetailCommentView
            key={reply.id}
            comment={reply}
            replyDetail={replyDetail}
          />
        ))}
      </ScrollView>
      <ReplyDetailInputView
        replyDetail={replyDetail}
        scrollViewRef={scrollViewRef as React.RefObject<ScrollView>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  scrollView: {
    flex: 1,
  },
});

export default observer(ReplyDetailView);
