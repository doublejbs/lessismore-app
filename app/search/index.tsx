import { observer } from 'mobx-react-lite';
import SearchWarehouseView from '@/components/search/SearchWarehouseView';
import { useState } from 'react';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import { useRouter } from 'expo-router';

const SearchPage = () => {
  const router = useRouter();
  const [searchWarehouse] = useState(() => SearchWarehouse.new(router));

  return <SearchWarehouseView searchWarehouse={searchWarehouse} />;
};

export default observer(SearchPage);
