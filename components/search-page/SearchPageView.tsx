import { observer } from 'mobx-react-lite';
import { FC } from 'react';
import SearchResultView from '../search/SearchResultView';
import SearchBarView from '../search/SearchBarView';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import Layout from '../Layout';

interface Props {
  searchWarehouse: SearchWarehouse;
}

const SearchPageView: FC<Props> = ({ searchWarehouse }) => {
  return (
    <Layout paddingHorizontal={0}>
      <SearchBarView searchWarehouse={searchWarehouse} />
      <SearchResultView searchWarehouse={searchWarehouse} />
    </Layout>
  );
};

export default observer(SearchPageView);
