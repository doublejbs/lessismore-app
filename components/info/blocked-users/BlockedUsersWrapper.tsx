import { FC, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import app from '@/model/app/App';
import BlockedUsers from '@/model/blocked-users/BlockedUsers';
import BlockedUsersView from './BlockedUsersView';

const BlockedUsersWrapper: FC = () => {
  const [blockedUsers] = useState(() =>
    BlockedUsers.from(app.getBlockedUserStore()!)
  );

  useEffect(() => {
    void blockedUsers.initialize();
  }, [blockedUsers]);

  return <BlockedUsersView blockedUsers={blockedUsers} />;
};

export default observer(BlockedUsersWrapper);
