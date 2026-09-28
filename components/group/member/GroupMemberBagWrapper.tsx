import { FC, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useLocalSearchParams } from 'expo-router';
import GroupMemberBag from '@/model/group-member-bag/GroupMemberBag';
import GroupMemberBagDispatcher from '@/model/group-member-bag/GroupMemberBagDispatcher';
import GroupMemberBagView from './GroupMemberBagView';

// 멤버 배낭 상세 래퍼 — 도메인 객체를 1회 만들고 화면에 넘긴다.
const GroupMemberBagWrapper: FC = () => {
  const { id, uid } = useLocalSearchParams<{ id: string; uid: string }>();
  const [bag] = useState(() =>
    GroupMemberBag.from(GroupMemberBagDispatcher.new(), id ?? '', uid ?? '')
  );

  return <GroupMemberBagView bag={bag} />;
};

export default observer(GroupMemberBagWrapper);
