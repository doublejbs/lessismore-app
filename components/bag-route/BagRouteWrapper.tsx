import { FC, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useLocalSearchParams } from 'expo-router';
import BagRouteDispatcher from '@/model/bag-route/BagRouteDispatcher';
import BagRouteList from '@/model/bag-route/BagRouteList';
import BagRouteView from './BagRouteView';

// 배낭 코스 래퍼 (BD-11) — 도메인 객체를 1회 만들고 화면에 넘긴다.
const BagRouteWrapper: FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [bagRouteList] = useState(() =>
    BagRouteList.from(BagRouteDispatcher.new(), id ?? '')
  );

  return <BagRouteView bagRouteList={bagRouteList} />;
};

export default observer(BagRouteWrapper);
