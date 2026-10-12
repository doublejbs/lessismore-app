import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import BagWeather from '@/model/bag/BagWeather';
import BagDestinationHubView from '@/components/bag-destination/BagDestinationHubView';
import app from '@/model/app/App';
import { loadBagWeather } from '@/model/offline/OfflineBagWeather';

const BagWeatherScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [bagWeather] = useState(() => BagWeather.of(id, app.getBagStore()!));

  // 오프라인이면 저장본의 여행지·날씨로 그린다(OF-5).
  useEffect(() => {
    void loadBagWeather(bagWeather, id);
  }, [bagWeather, id]);

  return <BagDestinationHubView bagWeather={bagWeather} />;
};

export default BagWeatherScreen;
