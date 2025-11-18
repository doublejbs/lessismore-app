import { useState } from 'react';
import { useRouter } from 'expo-router';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import { observer } from 'mobx-react-lite';
import SearchPageView from '@/components/search-page/SearchPageView';

const SearchPage = () => {
  const router = useRouter();
  const [searchWarehouse] = useState(() => SearchWarehouse.new(router));

  return <SearchPageView searchWarehouse={searchWarehouse} />;
};

export default observer(SearchPage);
