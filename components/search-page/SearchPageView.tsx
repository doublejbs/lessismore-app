import { observer } from 'mobx-react-lite';
import { FC } from 'react';
import SearchResultView from '../search/SearchResultView';
import SearchBarView from '../search/SearchBarView';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import Bag from '@/model/bag/Bag';
import Layout from '../Layout';

interface Props {
  searchWarehouse: SearchWarehouse;
  bag: Bag;
}

const SearchPageView: FC<Props> = ({ searchWarehouse, bag }) => {
  return (
    <Layout paddingHorizontal={0}>
      <SearchBarView searchWarehouse={searchWarehouse} />
      <SearchResultView searchWarehouse={searchWarehouse} bag={bag} />
    </Layout>
  );
};

export default observer(SearchPageView);
