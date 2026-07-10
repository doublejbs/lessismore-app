import { useState } from 'react';
import { useRouter } from 'expo-router';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import Bag from '@/model/bag/Bag';
import Feed from '@/model/feed/Feed';
import { observer } from 'mobx-react-lite';
import SearchPageView from '@/components/search-page/SearchPageView';

const SearchPage = () => {
  const router = useRouter();
  const [searchWarehouse] = useState(() => SearchWarehouse.new(router));
  const [bag] = useState(() => Bag.new());
  // 피드 필터 상태를 검색과 공유하기 위해 피드 도메인 객체를 탭 수준에서 생성한다(FD-3 검색 승계).
  const [feed] = useState(() => Feed.new(router));

  return (
    <SearchPageView searchWarehouse={searchWarehouse} bag={bag} feed={feed} />
  );
};

export default observer(SearchPage);
