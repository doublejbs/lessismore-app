import { FC, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import BrandDirectory from '@/model/browse/BrandDirectory';
import Layout from '../Layout';
import BrandDirectoryView from './BrandDirectoryView';

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
    <Layout paddingHorizontal={0}>
      <BrandDirectoryView brandDirectory={brandDirectory} />
    </Layout>
  );
};

export default observer(BrandDirectoryWrapper);
