import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import BagEdit from '@/model/bag-edit/BagEdit';
import BagEditView from '@/components/bag-edit/BagEditView';

// BT-4 장비 편집 — 화면은 BD-4의 BagEditView를 재사용하지만 저장 대상은 템플릿 문서 하나다.
const BagTemplateEditWrapper = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [bagEdit] = useState(() => BagEdit.fromTemplate(router, id ?? ''));

  useEffect(() => {
    return () => bagEdit.dispose();
  }, [bagEdit]);

  return <BagEditView bagEdit={bagEdit} />;
};

export default BagTemplateEditWrapper;
