import CustomGearView from '@/components/gear/custom/CustomGearView';
import CustomGearForBag from '@/model/gear/custom/CustomGearForBag';
import { FC, useEffect, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';

const CustomBagGearIndex: FC = () => {
  const router = useRouter();
  // SR-11: `name`은 배낭 검색 결과 없음 `직접 추가`의 제품명 프리필.
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const [customGear] = useState(() =>
    CustomGearForBag.newForBag(router, id ?? '', name ?? '')
  );

  useEffect(() => {
    customGear.initialize();
  }, []);

  return <CustomGearView customGear={customGear} />;
};

export default CustomBagGearIndex;
