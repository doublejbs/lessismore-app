import BagMemoInputView from '@/components/bag/BagMemoInputView';
import BagMemo from '@/model/bag/BagMemo';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform } from 'react-native';
import Layout from '@/components/Layout';
import LiquidBackdrop from '@/components/liquid/LiquidBackdrop';
import app from '@/model/app/App';

// LG-1: iOS는 네이티브 투명 헤더가 상단을 덮으므로 top 세이프에어리어를 빼
// 이중 인셋을 막는다(헤더 밑 여백은 뷰가 직접 잡는다). 하단은 기존 동작 유지.
const IOS_EDGES = ['left', 'right', 'bottom'] as const;

const BagMemoInput = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [bagMemo] = useState(() =>
    BagMemo.of(
      id,
      app.getFirebase(),
      app.getBagStore()!,
      app.getAlertManager()!,
      app.getToastManager()!
    )
  );

  return (
    <Layout
      paddingHorizontal={0}
      edges={Platform.OS === 'ios' ? IOS_EDGES : undefined}
      background={<LiquidBackdrop screen='none' glowPosition='topRight' />}
    >
      <BagMemoInputView bagMemo={bagMemo} />
    </Layout>
  );
};

export default BagMemoInput;
