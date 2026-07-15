import { observer } from 'mobx-react-lite';
import { FC } from 'react';
import SearchResultView from '../search/SearchResultView';
import SearchBarView from '../search/SearchBarView';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import Bag from '@/model/bag/Bag';
import Feed from '@/model/feed/Feed';
import useSearchFilterInheritance from '@/hooks/useSearchFilterInheritance';
import Layout from '../Layout';

interface Props {
  searchWarehouse: SearchWarehouse;
  bag: Bag;
  feed: Feed;
}

const SearchPageView: FC<Props> = ({ searchWarehouse, bag, feed }) => {
  // 검색 승계(SR-1): 현재 피드 필터를 검색 facet으로 넘기고 필터 변경 시 재검색.
  useSearchFilterInheritance(searchWarehouse, feed);

  return (
    <Layout paddingHorizontal={0}>
      <SearchBarView searchWarehouse={searchWarehouse} />
      <SearchResultView
        searchWarehouse={searchWarehouse}
        bag={bag}
        feed={feed}
      />
    </Layout>
  );
};

export default observer(SearchPageView);
