import { FC, useState } from 'react';
import { Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import BagUselessView from '@/components/bag-useless/BagUselessView';
import BagUseless from '@/model/bag-useless/BagUseless';
import Layout from '@/components/Layout';
import LiquidBackdrop from '@/components/liquid/LiquidBackdrop';

// LG-1: iOS는 네이티브 투명 헤더가 상단을 덮으므로 top 세이프에어리어를 빼
// 이중 인셋을 막는다(뷰가 insets.top+44 여백을 직접 잡는다). 하단은 기존 동작 유지.
const IOS_EDGES = ['left', 'right', 'bottom'] as const;

const UselessPage: FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [bagUseless] = useState(() => BagUseless.new(router, id ?? ''));

  return (
    <Layout
      edges={Platform.OS === 'ios' ? IOS_EDGES : undefined}
      // 지형 + 짙은 베일, 글로우 없음 — 패킹 모드와 같은 지면이다(BD-5는 그 화면의 짝이고,
      // 유리 진행 카드가 지면 최상단에 앉아 모서리 글로우가 카드 뒤 얼룩으로 읽힌다).
      background={<LiquidBackdrop screen='packing' limeGlow={false} />}
    >
      <BagUselessView bagUseless={bagUseless} />
    </Layout>
  );
};

export default UselessPage;
