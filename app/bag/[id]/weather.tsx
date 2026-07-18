import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import BagWeather from '@/model/bag/BagWeather';
import BagDestinationHubView from '@/components/bag-destination/BagDestinationHubView';
import app from '@/model/app/App';

const BagWeatherScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [bagWeather] = useState(() =>
    BagWeather.of(id, app.getBagStore()!)
  );

  useEffect(() => {
    void bagWeather.load();
  }, [bagWeather]);

  return <BagDestinationHubView bagWeather={bagWeather} />;
};

export default BagWeatherScreen;
