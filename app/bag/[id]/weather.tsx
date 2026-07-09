import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import BagWeather from '@/model/bag/BagWeather';
import BagWeatherView from '@/components/weather/BagWeatherView';
import app from '@/model/app/App';

const BagWeatherScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [bagWeather] = useState(() =>
    BagWeather.of(id, app.getBagStore()!)
  );

  useEffect(() => {
    void bagWeather.load();
  }, [bagWeather]);

  return <BagWeatherView bagWeather={bagWeather} />;
};

export default BagWeatherScreen;
