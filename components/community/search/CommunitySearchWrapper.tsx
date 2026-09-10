import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import CommunitySearch from '@/model/community-search/CommunitySearch';
import CommunitySearchDispatcher from '@/model/community-search/CommunitySearchDispatcher';
import CommunitySearchView from './CommunitySearchView';

const CommunitySearchWrapper = () => {
  const [search] = useState(() =>
    CommunitySearch.from(CommunitySearchDispatcher.new())
  );

  useEffect(() => {
    return () => {
      search.dispose();
    };
  }, [search]);

  return <CommunitySearchView search={search} />;
};

export default observer(CommunitySearchWrapper);
