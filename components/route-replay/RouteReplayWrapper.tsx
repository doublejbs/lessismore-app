import { useEffect, useState } from 'react';
import app from '@/model/app/App';
import RouteReplayView from './RouteReplayView';

/**
 * 3D 리플레이 래퍼(RR-2). 스토어의 진입 데이터를 **마운트 때 한 번** 읽어 화면에 넘기고,
 * 화면이 닫히면 스토어를 비운다(§4 — 메모리뿐, 남겨 두지 않는다).
 */
const RouteReplayWrapper = () => {
  const [request] = useState(() => app.getRouteReplayStore().getRequest());

  useEffect(() => {
    return () => {
      app.getRouteReplayStore().clear();
    };
  }, []);

  return <RouteReplayView request={request} />;
};

export default RouteReplayWrapper;
