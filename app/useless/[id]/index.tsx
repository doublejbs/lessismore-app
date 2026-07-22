import { FC, useState } from 'react';
import { Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import BagUselessView from '@/components/bag-useless/BagUselessView';
import BagUseless from '@/model/bag-useless/BagUseless';
import Layout from '@/components/Layout';

// LG-1: iOS는 네이티브 투명 헤더가 상단을 덮으므로 top 세이프에어리어를 빼
// 이중 인셋을 막는다(뷰가 insets.top+44 여백을 직접 잡는다). 하단은 기존 동작 유지.
const IOS_EDGES = ['left', 'right', 'bottom'] as const;

const UselessPage: FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [bagUseless] = useState(() => BagUseless.new(router, id ?? ''));

  return (
    <Layout edges={Platform.OS === 'ios' ? IOS_EDGES : undefined}>
      <BagUselessView bagUseless={bagUseless} />
    </Layout>
  );
};

export default UselessPage;
