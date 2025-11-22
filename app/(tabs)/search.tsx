import { useState } from 'react';
import { useRouter } from 'expo-router';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import Bag from '@/model/bag/Bag';
import { observer } from 'mobx-react-lite';
import SearchPageView from '@/components/search-page/SearchPageView';

const SearchPage = () => {
  const router = useRouter();
  const [searchWarehouse] = useState(() => SearchWarehouse.new(router));
  const [bag] = useState(() => Bag.new());

  return <SearchPageView searchWarehouse={searchWarehouse} bag={bag} />;
};

export default observer(SearchPage);
