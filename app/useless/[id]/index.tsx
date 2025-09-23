import { FC, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import BagUselessView from '@/components/bag-useless/BagUselessView';
import BagUseless from '@/model/bag-useless/BagUseless';
import Layout from '@/components/Layout';

const UselessPage: FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [bagUseless] = useState(() => BagUseless.new(router, id ?? ''));

  return (
    <Layout>
      <BagUselessView bagUseless={bagUseless} />
    </Layout>
  );
};

export default UselessPage;
