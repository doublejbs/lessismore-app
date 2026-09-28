import { FC, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useLocalSearchParams } from 'expo-router';
import GroupDetail from '@/model/group-detail/GroupDetail';
import GroupDetailDispatcher from '@/model/group-detail/GroupDetailDispatcher';
import GroupDetailView from './GroupDetailView';

// 그룹 상세 래퍼 — 도메인 객체를 1회 만들고 화면에 넘긴다.
const GroupDetailWrapper: FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detail] = useState(() =>
    GroupDetail.from(GroupDetailDispatcher.new(), id ?? '')
  );

  return <GroupDetailView detail={detail} />;
};

export default observer(GroupDetailWrapper);
