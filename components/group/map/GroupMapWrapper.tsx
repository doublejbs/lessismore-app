import { FC, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useLocalSearchParams } from 'expo-router';
import GroupMap from '@/model/group-map/GroupMap';
import GroupMapDispatcher from '@/model/group-map/GroupMapDispatcher';
import {
  clearPendingGroupPoint,
  getPendingGroupPoint,
} from '@/model/group-map/GroupMapHandoff';
import GroupPointDispatcher from '@/model/group-point/GroupPointDispatcher';
import GroupPointList from '@/model/group-point/GroupPointList';
import GroupMapView from './GroupMapView';

// 그룹 지도 래퍼 — 도메인 객체를 1회 만들고 화면에 넘긴다(GRP-9 · GRP-10).
const GroupMapWrapper: FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [groupMap] = useState(() =>
    GroupMap.from(
      GroupMapDispatcher.new(),
      GroupPointList.from(GroupPointDispatcher.new(), id ?? ''),
      id ?? ''
    )
  );

  // 목록에서 찍고 들어온 포인트를 한 번만 소비한다.
  useEffect(() => {
    const pointId = getPendingGroupPoint();

    if (!pointId) {
      return;
    }

    clearPendingGroupPoint();
    groupMap.focusPoint(pointId);
  }, [groupMap]);

  return <GroupMapView groupMap={groupMap} />;
};

export default observer(GroupMapWrapper);
