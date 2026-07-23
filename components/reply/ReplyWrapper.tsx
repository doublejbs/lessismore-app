import ReplyView from './ReplyView';
import Layout from '../Layout';
import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import Reply from '@/model/reply/Reply';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import app from '@/model/app/App';

// LG-1: iOS는 네이티브 투명 헤더가 상단을 덮고 스크롤 뷰가 자동 인셋을 받으므로
// top 세이프에어리어를 빼 이중 인셋을 막는다. 하단은 기존 동작 유지.
const IOS_EDGES = ['left', 'right', 'bottom'] as const;

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
    <Layout
      paddingHorizontal={0}
      edges={Platform.OS === 'ios' ? IOS_EDGES : undefined}
    >
      <ReplyView reply={reply} />
    </Layout>
  );
};

export default ReplyWrapper;
