import SearchWarehouse from '@/model/search/SearchWarehouse';
import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import SearchWarehouseView from '@/components/search/SearchWarehouseView';

const SearchPage = () => {
  const router = useRouter();
  const [searchWarehouse] = useState(() => SearchWarehouse.new(router));

  return (
    <View
      style={{
        flex: 1,
      }}
    >
      <SearchWarehouseView searchWarehouse={searchWarehouse} />
    </View>
  );
};

export default SearchPage;
