import { useState } from 'react';
import app from '@/model/app/App';
import RouteReplayView from './RouteReplayView';

/**
 * 3D 리플레이 래퍼(RR-2). 스토어의 진입 데이터를 **마운트 때 한 번** 읽어 화면에 넘긴다.
 *
 * 언마운트에서 스토어를 비우지 않는다 — 모달 전환 중 래퍼가 다시 마운트되면(2026-10-12 TestFlight 실측:
 * `3D`를 누르자 `코스 화면에서 3D를 열어 주세요` 빈 상태가 떴다) 첫 인스턴스의 정리가 두 번째 인스턴스가
 * 읽을 값을 지워 버린다. 데이터는 메모리뿐이고 다음 `open`이 덮어쓰므로 남겨 둬도 해가 없다(§4).
 */
const RouteReplayWrapper = () => {
  const [request] = useState(() => app.getRouteReplayStore().getRequest());

  return <RouteReplayView request={request} />;
};

export default RouteReplayWrapper;
