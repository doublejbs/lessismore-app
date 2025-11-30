import CustomGearView from '@/components/gear/custom/CustomGearView';
import CustomGearForBag from '@/model/gear/custom/CustomGearForBag';
import { FC, useEffect, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';

const CustomBagGearIndex: FC = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [customGear] = useState(() =>
    CustomGearForBag.newForBag(router, id ?? '')
  );

  useEffect(() => {
    customGear.initialize();
  }, []);

  return <CustomGearView customGear={customGear} />;
};

export default CustomBagGearIndex;
