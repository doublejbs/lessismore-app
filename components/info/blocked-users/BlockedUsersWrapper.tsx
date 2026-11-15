import { FC, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import app from '@/model/app/App';
import BlockedUsers from '@/model/blocked-users/BlockedUsers';
import BlockedUsersView from './BlockedUsersView';

const BlockedUsersWrapper: FC = () => {
  const [blockedUsers] = useState(() => {
    const store = app.getBlockedUserStore();

    return store ? BlockedUsers.from(store) : null;
  });

  useEffect(() => {
    void blockedUsers?.initialize();
  }, [blockedUsers]);

  // 앱 초기화 전(스토어 없음)에는 그리지 않는다 — 루트 레이아웃이 스플래시를 띄운다.
  if (!blockedUsers) {
    return null;
  }

  return <BlockedUsersView blockedUsers={blockedUsers} />;
};

export default observer(BlockedUsersWrapper);
