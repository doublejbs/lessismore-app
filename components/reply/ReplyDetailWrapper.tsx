import ReplyDetailView from './ReplyDetailView';
import Layout from '../Layout';
import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import ReplyDetail from '@/model/reply/ReplyDetail';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import app from '@/model/app/App';
import { observer } from 'mobx-react-lite';

// LG-1: iOS는 네이티브 투명 헤더가 상단을 덮고 스크롤 뷰가 자동 인셋을 받으므로
// top 세이프에어리어를 빼 이중 인셋을 막는다. 하단은 기존 동작 유지.
const IOS_EDGES = ['left', 'right', 'bottom'] as const;

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
    <Layout
      paddingHorizontal={0}
      edges={Platform.OS === 'ios' ? IOS_EDGES : undefined}
    >
      <ReplyDetailView
        replyDetail={replyDetail}
        originalComment={originalComment}
      />
    </Layout>
  );
};

export default observer(ReplyDetailWrapper);
