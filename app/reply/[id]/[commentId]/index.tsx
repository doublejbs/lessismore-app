import { useLocalSearchParams } from 'expo-router';
import Layout from '@/components/Layout';
import { Text } from 'react-native';

const ReplyCommentView = () => {
  const { id, commentId } = useLocalSearchParams<{
    id: string;
    commentId: string;
  }>();

  return (
    <Layout paddingHorizontal={0}>
      <Text>{commentId}</Text>
    </Layout>
  );
};

export default ReplyCommentView;
