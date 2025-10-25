import ReplyDetailView from './ReplyDetailView';
import Layout from '../Layout';
import { useCallback, useState } from 'react';
import ReplyDetail from '@/model/reply/ReplyDetail';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import app from '@/model/app/App';
import { observer } from 'mobx-react-lite';

const ReplyDetailWrapper = () => {
  const { id, commentId } = useLocalSearchParams<{
    id: string;
    commentId: string;
  }>();
  const [replyDetail] = useState(() =>
    ReplyDetail.of(id, commentId, app.getReplyStore()!)
  );

  useFocusEffect(
    useCallback(() => {
      replyDetail.initialize();
    }, [replyDetail])
  );

  const originalComment = replyDetail.getOriginalComment();

  if (!originalComment) {
    return null;
  }

  return (
    <Layout paddingHorizontal={0}>
      <ReplyDetailView
        replyDetail={replyDetail}
        originalComment={originalComment}
      />
    </Layout>
  );
};

export default observer(ReplyDetailWrapper);
