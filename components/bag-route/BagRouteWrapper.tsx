import { FC, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useLocalSearchParams } from 'expo-router';
import BagPointDispatcher from '@/model/bag-point/BagPointDispatcher';
import BagPointList from '@/model/bag-point/BagPointList';
import BagRouteDispatcher from '@/model/bag-route/BagRouteDispatcher';
import BagRouteList from '@/model/bag-route/BagRouteList';
import RouteDrawEntry from '@/model/route-draw/RouteDrawEntry';
import BagRouteView from './BagRouteView';

// 배낭 코스 래퍼 (BD-11 · BD-14) — 코스·포인트 도메인 객체를 1회 만들고 화면에 넘긴다.
const BagRouteWrapper: FC = () => {
  // `entry=highlight`: 여행 상세 상황형 강조 `코스`에서 왔다(RD-9 #4 — 측정만, 그리기를 자동으로 시작하지 않는다).
  const { id, entry } = useLocalSearchParams<{ id: string; entry?: string }>();
  const [fromHighlight] = useState(() => entry === RouteDrawEntry.Highlight);
  const [bagRouteList] = useState(() =>
    BagRouteList.from(BagRouteDispatcher.new(), id ?? '')
  );
  const [bagPointList] = useState(() =>
    BagPointList.from(BagPointDispatcher.new(), id ?? '')
  );

  return (
    <BagRouteView
      bagRouteList={bagRouteList}
      bagPointList={bagPointList}
      fromHighlight={fromHighlight}
    />
  );
};

export default observer(BagRouteWrapper);
