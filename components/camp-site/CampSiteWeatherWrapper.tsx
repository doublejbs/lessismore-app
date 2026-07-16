import { FC, useEffect, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useLocalSearchParams, useRouter } from 'expo-router';
import CampSiteWeather from '@/model/camp-site/CampSiteWeather';
import CampSiteWeatherDispatcher from '@/model/camp-site/CampSiteWeatherDispatcher';
import CampSiteWeatherView from './CampSiteWeatherView';
import Layout from '../Layout';

// 상세 시트 위에 겹쳐 뜨는 시트라(CS-3) 상단엔 상태바가 없다 — top 인셋을 빼야
// 헤더 위에 빈 띠가 생기지 않는다. 하단은 홈 인디케이터 회피가 필요해 남긴다.
const SHEET_EDGES = ['bottom'] as const;

// 상세 시트와 같은 이유로 높이를 명시한다(CampSiteDetailWrapper 주석 참고) —
// formSheet 안은 React 레이아웃 높이가 무제한이라 명시하지 않으면 주간 예보가 스크롤되지 않는다.
// 상세보다 높게 잡는다 — 날씨는 목록을 훑는 화면이라 한 번에 많이 보이는 편이 낫다.
const SHEET_HEIGHT_RATIO = 0.85;

const CampSiteWeatherWrapper: FC = () => {
  const router = useRouter();
  const { height: windowHeight } = useWindowDimensions();
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
      <View style={{ height: windowHeight * SHEET_HEIGHT_RATIO }}>
        <Layout paddingHorizontal={0} edges={SHEET_EDGES}>
          <CampSiteWeatherView campSiteWeather={campSiteWeather} />
        </Layout>
      </View>
    );
  } else {
    return null;
  }
};

export default observer(CampSiteWeatherWrapper);
