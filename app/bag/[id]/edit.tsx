import { useLocalSearchParams, useRouter } from 'expo-router';
import BagEditView from '@/components/bag-edit/BagEditView';
import { useState } from 'react';
import BagEdit from '@/model/bag-edit/BagEdit';

const BagEditWrapper = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [bagEdit] = useState(() => BagEdit.from(router, id ?? ''));

  return <BagEditView bagEdit={bagEdit} />;
};

export default BagEditWrapper;
