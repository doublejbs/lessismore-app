import { FC, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useLocalSearchParams } from 'expo-router';
import GroupMap from '@/model/group-map/GroupMap';
import GroupMapDispatcher from '@/model/group-map/GroupMapDispatcher';
import GroupPointDispatcher from '@/model/group-point/GroupPointDispatcher';
import GroupPointList from '@/model/group-point/GroupPointList';
import GroupRouteDispatcher from '@/model/group-route/GroupRouteDispatcher';
import GroupRouteList from '@/model/group-route/GroupRouteList';
import GroupMapView from './GroupMapView';

/**
 * 그룹 지도 래퍼 — 도메인 객체를 1회 만들고 화면에 넘긴다(GRP-9 · GRP-10).
 * 코스 목록은 업로드·삭제까지 하는 `GroupRouteList` 하나를 지도 모델에 넘긴다 — 지도·그래프·
 * 코스 목록 시트·`코스 추가`가 같은 목록을 봐야 올린 코스가 세 곳에 곧바로 나타난다.
 */
const GroupMapWrapper: FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [groupMap] = useState(() =>
    GroupMap.from(
      GroupMapDispatcher.new(),
      GroupPointList.from(GroupPointDispatcher.new(), id ?? ''),
      GroupRouteList.from(GroupRouteDispatcher.new(), id ?? ''),
      id ?? ''
    )
  );

  return <GroupMapView groupMap={groupMap} />;
};

export default observer(GroupMapWrapper);
