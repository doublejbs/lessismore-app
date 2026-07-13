import ReplyEditView from '@/components/reply/ReplyEditView';
import { useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import app from '@/model/app/App';
import Comment from '@/model/reply/Comment';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

const ReplyEdit = () => {
  const { id, commentId } = useLocalSearchParams<{
    id: string;
    commentId: string;
  }>();
  const [comment, setComment] = useState<Comment | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadComment = async () => {
      try {
        const loaded = await app.getReplyStore()?.getComment(id, commentId);

        if (loaded) {
          setComment(loaded);
        }
      } catch (error) {
        console.error('댓글 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadComment();
  }, [id, commentId]);

  if (isLoading || comment === null) {
    return (
      <Layout paddingHorizontal={0}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color='#000' />
        </View>
      </Layout>
    );
  }

  // 최상위 댓글(=리뷰)만 별점을 편집한다. 답글은 글만 수정한다.
  const isTopLevel = comment.parentId == null;

  return (
    <Layout paddingHorizontal={0}>
      <ReplyEditView
        gearId={id}
        commentId={commentId}
        initialContent={comment.content}
        isTopLevel={isTopLevel}
        initialRating={comment.rating ?? 0}
      />
    </Layout>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ReplyEdit;
