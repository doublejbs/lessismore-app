import { FC, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useLocalSearchParams, useRouter } from 'expo-router';
import BagPacking from '@/model/bag-packing/BagPacking';
import BagPackingView from '@/components/bag-packing/BagPackingView';

const BagPackingWrapper: FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [bagPacking] = useState(() => BagPacking.from(router, id ?? ''));

  useEffect(() => {
    void bagPacking.initialize();

    // 화면 이탈 시 미완료 로그를 남기고 미저장분을 즉시 플러시한다(PK-4).
    return () => {
      bagPacking.logExitIfIncomplete();
      void bagPacking.flush();
    };
  }, [bagPacking]);

  return <BagPackingView bagPacking={bagPacking} />;
};

export default observer(BagPackingWrapper);
