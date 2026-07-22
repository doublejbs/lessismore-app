import { FC, useEffect, useState } from 'react';
import app from '@/model/app/App';
import BagActivity from '@/model/bag/BagActivity';
import { getHealthService } from '@/model/health/HealthService';
import BagActivityView from './BagActivityView';

interface Props {
  bagId: string;
}

// 운동 기록 연결 화면의 래퍼(HA-3). 도메인 객체를 1회 생성하고 초기 로드를 건다.
// 여기서는 권한을 요청하지 않는다 — 화면 진입만으로 시트가 뜨면 안 된다(HA-2).
const BagActivityWrapper: FC<Props> = ({ bagId }) => {
  const [bagActivity] = useState(() =>
    BagActivity.of(
      bagId,
      app.getBagStore()!,
      getHealthService(),
      app.getToastManager()!
    )
  );

  useEffect(() => {
    void bagActivity.load();
  }, [bagActivity]);

  return <BagActivityView bagActivity={bagActivity} />;
};

export default BagActivityWrapper;
