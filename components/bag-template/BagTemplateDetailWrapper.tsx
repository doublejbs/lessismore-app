import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import BagTemplateDetail from '@/model/bag-template/BagTemplateDetail';
import BagTemplateDetailView from './BagTemplateDetailView';

// BT-4 3단 래퍼의 도메인 생성 지점. 라우트는 이 래퍼만 렌더한다.
const BagTemplateDetailWrapper = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detail] = useState(() => BagTemplateDetail.from(router, id ?? ''));

  return <BagTemplateDetailView detail={detail} />;
};

export default observer(BagTemplateDetailWrapper);
