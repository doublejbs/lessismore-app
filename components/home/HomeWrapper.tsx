import { FC, useState } from 'react';
import { useRouter } from 'expo-router';
import { observer } from 'mobx-react-lite';
import Home from '@/model/home/Home';
import HomeView from '@/components/home/HomeView';

// 홈 탭(HM). 도메인 객체를 1회만 만들어 화면에 넘긴다(앱 공통 3단 래퍼 패턴).
const HomeWrapper: FC = () => {
  const router = useRouter();
  const [home] = useState(() => Home.new(router));

  return <HomeView home={home} />;
};

export default observer(HomeWrapper);
