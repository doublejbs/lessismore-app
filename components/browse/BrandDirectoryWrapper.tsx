import { FC, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import BrandDirectory from '@/model/browse/BrandDirectory';
import Layout from '../Layout';
import BrandDirectoryView from './BrandDirectoryView';

// LG-1: iOS는 네이티브 투명 헤더가 상단을 덮으므로 top 세이프에어리어를 빼
// 이중 인셋을 막는다(뷰가 insets.top+44 여백을 직접 잡는다). 하단은 기존 동작 유지.
const IOS_EDGES = ['left', 'right', 'bottom'] as const;

const BrandDirectoryWrapper: FC = () => {
  const router = useRouter();
  const [brandDirectory] = useState(() => BrandDirectory.new(router));
  const initialized = brandDirectory.isInitialized();

  useEffect(() => {
    brandDirectory.initialize();
  }, [brandDirectory]);

  if (!initialized) {
    return null;
  }

  return (
    <Layout
      paddingHorizontal={0}
      edges={Platform.OS === 'ios' ? IOS_EDGES : undefined}
    >
      <BrandDirectoryView brandDirectory={brandDirectory} />
    </Layout>
  );
};

export default observer(BrandDirectoryWrapper);
