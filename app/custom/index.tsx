import CustomGearView from '@/components/gear/custom/CustomGearView';
import CustomGear from '@/model/gear/custom/CustomGear';
import { FC, useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

const CustomIndex: FC = () => {
  const router = useRouter();
  // SR-11: 검색 결과 없음 `직접 추가`가 검색어를 제품명 프리필로 넘긴다.
  // OB-6: 첫 여행 가이드 `직접 추가`가 카테고리(GearFilter 그룹 키)를 넘긴다.
  const { name, category } = useLocalSearchParams<{
    name?: string;
    category?: string;
  }>();
  const [customGear] = useState(() =>
    CustomGear.new(router, name ?? '', category ?? '')
  );

  useEffect(() => {
    customGear.initialize();
  }, []);

  return <CustomGearView customGear={customGear} />;
};

export default CustomIndex;
