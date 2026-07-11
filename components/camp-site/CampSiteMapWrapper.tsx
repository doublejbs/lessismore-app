import { FC, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import CampSiteMap from '@/model/camp-site/CampSiteMap';
import CampSiteMapView from './CampSiteMapView';

// 3단 래퍼(라우트 → Wrapper → View): 도메인 객체를 1회 생성하고 초기화 가드를 둔다(CS-1).
const CampSiteMapWrapper: FC = () => {
  const [campSiteMap] = useState(() => CampSiteMap.new());
  const initialized = campSiteMap.isInitialized();

  useEffect(() => {
    campSiteMap.initialize();
  }, [campSiteMap]);

  if (!initialized) {
    return null;
  }

  return <CampSiteMapView campSiteMap={campSiteMap} />;
};

export default observer(CampSiteMapWrapper);
