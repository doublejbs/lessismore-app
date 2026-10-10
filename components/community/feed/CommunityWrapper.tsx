import { FC, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import CommunityFeed from '@/model/community-feed/CommunityFeed';
import CommunityFeedDispatcher from '@/model/community-feed/CommunityFeedDispatcher';
import CommunityView from './CommunityView';

const CommunityWrapper: FC = () => {
  const [feed] = useState(() =>
    CommunityFeed.from(CommunityFeedDispatcher.new())
  );

  useEffect(() => {
    void feed.initialize();

    return () => {
      feed.dispose();
    };
  }, [feed]);

  return <CommunityView feed={feed} />;
};

export default observer(CommunityWrapper);
