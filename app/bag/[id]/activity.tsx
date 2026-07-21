import { useLocalSearchParams } from 'expo-router';
import Layout from '@/components/Layout';
import BagActivityWrapper from '@/components/bag-detail/health/BagActivityWrapper';

const BagActivityScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Layout paddingHorizontal={0} toastBottom={120}>
      <BagActivityWrapper bagId={id} />
    </Layout>
  );
};

export default BagActivityScreen;
