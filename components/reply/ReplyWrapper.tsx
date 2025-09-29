import ReplyView from './ReplyView';
import Layout from '../Layout';
import { useState } from 'react';
import Reply from '@/model/reply/Reply';
import { useLocalSearchParams } from 'expo-router';

const ReplyWrapper = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [reply] = useState(() => Reply.of(id));

  return (
    <Layout>
      <ReplyView reply={reply} />
    </Layout>
  );
};

export default ReplyWrapper;
