import CustomGearView from '@/components/gear/custom/CustomGearView';
import CustomGear from '@/model/gear/custom/CustomGear';
import { FC, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';

const CustomIndex: FC = () => {
  const router = useRouter();
  const [customGear] = useState(() => CustomGear.new(router));

  useEffect(() => {
    customGear.initialize();
  }, []);

  return <CustomGearView customGear={customGear} />;
};

export default CustomIndex;
