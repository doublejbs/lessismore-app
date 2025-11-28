import BagMemoInputView from '@/components/bag/BagMemoInputView';
import BagMemo from '@/model/bag/BagMemo';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import Layout from '@/components/Layout';
import app from '@/model/app/App';

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
    <Layout paddingHorizontal={0}>
      <BagMemoInputView bagMemo={bagMemo} />
    </Layout>
  );
};

export default BagMemoInput;
