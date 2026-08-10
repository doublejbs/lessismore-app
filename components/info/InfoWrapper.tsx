import { FC, useState } from 'react';
import { observer } from 'mobx-react-lite';
import InfoScreen from '@/components/info/InfoScreen';
import InfoStats from '@/model/info/InfoStats';

// 정보 탭(AU-4). 도메인 객체를 1회만 만들어 화면에 넘긴다(앱 공통 3단 래퍼 패턴).
const InfoWrapper: FC = () => {
  const [infoStats] = useState(() => InfoStats.new());

  return <InfoScreen infoStats={infoStats} />;
};

export default observer(InfoWrapper);
