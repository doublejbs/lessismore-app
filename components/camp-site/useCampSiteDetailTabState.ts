import { useState } from 'react';
import CampSiteDetailTab from '@/model/camp-site/CampSiteDetailTab';
import CampSiteWeather from '@/model/camp-site/CampSiteWeather';
import CampSiteWeatherDispatcher from '@/model/camp-site/CampSiteWeatherDispatcher';
import { CampSpot } from '@/model/camp-site/CampSpotTypes';

// 상세 시트 탭 상태(CS-3). 기본 선택은 '개요'이며 탭 전환 시 스크롤 위치는 유지하지 않는다.
// 날씨 모델은 탭 전환에도 살아 있어야 예보를 재사용하므로 여기서 1회 생성해 들고 있는다.
const useCampSiteDetailTabState = (spot: CampSpot | null) => {
  const [selectedTab, setSelectedTab] = useState(CampSiteDetailTab.Overview);
  const [campSiteWeather] = useState(() =>
    CampSiteWeather.from(CampSiteWeatherDispatcher.new())
  );

  // 날씨는 탭 첫 진입에만 조회한다(CS-3) — 상세 진입만으로는 호출하지 않는다.
  // 재진입 시 조회는 모델이 막는다(CampSiteWeather.initialize).
  const handleSelectTab = (tab: CampSiteDetailTab) => {
    setSelectedTab(tab);

    if (tab === CampSiteDetailTab.Weather && spot) {
      void campSiteWeather.initialize(spot);
    }
  };

  return { selectedTab, campSiteWeather, handleSelectTab };
};

export default useCampSiteDetailTabState;
