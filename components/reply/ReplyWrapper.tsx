import ReplyView from './ReplyView';
import Layout from '../Layout';
import LiquidBackdrop from '@/components/liquid/LiquidBackdrop';
import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import Reply from '@/model/reply/Reply';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import app from '@/model/app/App';

// LG-1: iOS는 네이티브 투명 헤더가 상단을 덮으므로 top 세이프에어리어를 빼
// 이중 인셋을 막는다(뷰가 insets.top + 44 여백을 직접 잡는다). 하단은 기존 동작 유지.
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
      // 지형 없이 지면 + 우상단 라임 글로우 — 목록·입력 화면이라 산세를 깔지 않는다(창고와 같은 판단).
      background={<LiquidBackdrop screen='none' glowPosition='topRight' />}
    >
      <ReplyView reply={reply} />
    </Layout>
  );
};

export default ReplyWrapper;
