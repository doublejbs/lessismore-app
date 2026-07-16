import { FC, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useLocalSearchParams, useRouter } from 'expo-router';
import CampSiteWeather from '@/model/camp-site/CampSiteWeather';
import CampSiteWeatherDispatcher from '@/model/camp-site/CampSiteWeatherDispatcher';
import CampSiteWeatherView from './CampSiteWeatherView';
import Layout from '../Layout';

// 상세 시트 안에서 열리는 화면이라(CS-2) 상단엔 상태바가 없다 — top 인셋을 빼야
// 헤더 위에 빈 띠가 생기지 않는다. 하단은 홈 인디케이터 회피가 필요해 남긴다.
const SHEET_EDGES = ['bottom'] as const;

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
      <Layout paddingHorizontal={0} edges={SHEET_EDGES}>
        <CampSiteWeatherView campSiteWeather={campSiteWeather} />
      </Layout>
    );
  } else {
    return null;
  }
};

export default observer(CampSiteWeatherWrapper);
