import { useLocalSearchParams } from 'expo-router';
import { Platform } from 'react-native';
import Layout from '@/components/Layout';
import BagActivityWrapper from '@/components/bag-detail/health/BagActivityWrapper';

// LG-1: iOS는 네이티브 투명 헤더가 상단을 덮으므로 top 세이프에어리어를 빼
// 이중 인셋을 막는다(헤더 밑 여백은 뷰가 직접 잡는다). 하단은 기존 동작 유지.
const IOS_EDGES = ['left', 'right', 'bottom'] as const;

const BagActivityScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Layout
      paddingHorizontal={0}
      edges={Platform.OS === 'ios' ? IOS_EDGES : undefined}
    >
      <BagActivityWrapper bagId={id} />
    </Layout>
  );
};

export default BagActivityScreen;
