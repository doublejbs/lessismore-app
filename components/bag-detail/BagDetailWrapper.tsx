import { FC, useEffect, useState } from 'react';
import BagDetail from '@/model/bag-detail/BagDetail';
import { observer } from 'mobx-react-lite';
import BagDetailView from '@/components/bag-detail/BagDetailView';
import { useLocalSearchParams, useRouter } from 'expo-router';

const BagDetailWrapper: FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [bagDetail] = useState(() => BagDetail.from(router, id ?? ''));

  // OF-3: 마운트 동안 연결 변화를 따라 서버 데이터 ↔ 저장본을 바꿔 그린다.
  useEffect(() => {
    bagDetail.startNetworkWatch();

    return () => {
      bagDetail.dispose();
    };
  }, [bagDetail]);

  return <BagDetailView bagDetail={bagDetail} />;
};

export default observer(BagDetailWrapper);
