import ReplyEditView from '@/components/reply/ReplyEditView';
import { useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import app from '@/model/app/App';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

const ReplyEdit = () => {
  const { id, commentId } = useLocalSearchParams<{
    id: string;
    commentId: string;
  }>();
  const [initialContent, setInitialContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadComment = async () => {
      try {
        const comment = await app.getReplyStore()?.getComment(id, commentId);
        if (comment) {
          setInitialContent(comment.content);
        }
      } catch (error) {
        console.error('댓글 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadComment();
  }, [id, commentId]);

  if (isLoading || initialContent === null) {
    return (
      <Layout paddingHorizontal={0}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color='#000' />
        </View>
      </Layout>
    );
  }

  return (
    <Layout paddingHorizontal={0}>
      <ReplyEditView
        gearId={id}
        commentId={commentId}
        initialContent={initialContent}
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
