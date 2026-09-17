import { FC, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useLocalSearchParams } from 'expo-router';
import GroupEdit from '@/model/group-edit/GroupEdit';
import GroupEditDispatcher from '@/model/group-edit/GroupEditDispatcher';
import GroupEditView from './GroupEditView';

// 그룹 정보 수정 래퍼 — 도메인 객체를 1회 만들고 화면에 넘긴다.
const GroupEditWrapper: FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [groupEdit] = useState(() =>
    GroupEdit.from(GroupEditDispatcher.new(), id ?? '')
  );

  return <GroupEditView groupEdit={groupEdit} />;
};

export default observer(GroupEditWrapper);
