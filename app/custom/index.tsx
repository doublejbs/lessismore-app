import CustomGearView from '@/components/gear/custom/CustomGearView';
import CustomGear from '@/model/gear/custom/CustomGear';
import { FC, useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

const CustomIndex: FC = () => {
  const router = useRouter();
  // SR-11: 검색 결과 없음 `직접 추가`가 검색어를 제품명 프리필로 넘긴다.
  const { name } = useLocalSearchParams<{ name?: string }>();
  const [customGear] = useState(() => CustomGear.new(router, name ?? ''));

  useEffect(() => {
    customGear.initialize();
  }, []);

  return <CustomGearView customGear={customGear} />;
};

export default CustomIndex;
