import { observer } from 'mobx-react-lite';
import SearchWarehouseView from '@/components/search/SearchWarehouseView';
import { useState } from 'react';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import Bag from '@/model/bag/Bag';
import Feed from '@/model/feed/Feed';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { GearAddContext } from '@/model/gear/GearAddContext';
import GearAddMode from '@/model/gear/GearAddMode';

// GE-8: 장비 추가 `검색으로 추가` 진입 모달. bagId가 있으면 그 배낭에 바로 담고, 없으면 창고 등록만.
// 탐색 탭과 동일하게 피드를 만들어 넘겨 검색 시에도 필터 바(카테고리·브랜드)를 유지·승계한다(SR-1).
const SearchPage = () => {
  const router = useRouter();
  const { bagId } = useLocalSearchParams<{ bagId?: string }>();
  const [searchWarehouse] = useState(() => SearchWarehouse.new(router));
  const [bag] = useState(() => Bag.new());
  const [feed] = useState(() => Feed.new(router));

  const gearAddContext: GearAddContext = bagId
    ? { mode: GearAddMode.Bag, bagId }
    : { mode: GearAddMode.Warehouse };

  return (
    <>
      <SearchWarehouseView
        searchWarehouse={searchWarehouse}
        bag={bag}
        feed={feed}
        gearAddContext={gearAddContext}
      />
    </>
  );
};

export default observer(SearchPage);
