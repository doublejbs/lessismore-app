import ReplyView from './ReplyView';
import Layout from '../Layout';
import { useCallback, useState } from 'react';
import Reply from '@/model/reply/Reply';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import app from '@/model/app/App';

const ReplyWrapper = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [reply] = useState(() =>
    Reply.of(id, app.getFirebase(), app.getReplyStore()!)
  );

  useFocusEffect(
    useCallback(() => {
      reply.initialize();
    }, [reply])
  );

  return (
    <Layout paddingHorizontal={0}>
      <ReplyView reply={reply} />
    </Layout>
  );
};

export default ReplyWrapper;
