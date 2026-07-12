import { FC, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useLocalSearchParams, useRouter } from 'expo-router';
import CampSiteWeather from '@/model/camp-site/CampSiteWeather';
import CampSiteWeatherDispatcher from '@/model/camp-site/CampSiteWeatherDispatcher';
import CampSiteWeatherView from './CampSiteWeatherView';
import Layout from '../Layout';

const CampSiteWeatherWrapper: FC = () => {
  const router = useRouter();
  const [campSiteWeather] = useState(() =>
    CampSiteWeather.from(router, CampSiteWeatherDispatcher.new())
  );
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const initialized = campSiteWeather.isInitialized();

  useEffect(() => {
    campSiteWeather.initialize(id);
  }, [id, campSiteWeather]);

  if (initialized) {
    return (
      <Layout paddingHorizontal={0}>
        <CampSiteWeatherView campSiteWeather={campSiteWeather} />
      </Layout>
    );
  } else {
    return null;
  }
};

export default observer(CampSiteWeatherWrapper);
