import { observer } from 'mobx-react-lite';
import SearchWarehouseView from '@/components/search/SearchWarehouseView';
import { useState } from 'react';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import Bag from '@/model/bag/Bag';
import Feed from '@/model/feed/Feed';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AlertView from '@/components/alert/AlertView';
import app from '@/model/app/App';
import LogInView from '@/components/login/LogInView';
import ToastView from '@/components/toast/ToastView';
import { GearAddContext } from '@/model/gear/GearAddContext';
import GearAddMode from '@/model/gear/GearAddMode';

// GE-8: 장비 추가 `검색으로 추가` 진입 모달. bagId가 있으면 그 배낭에 바로 담고, 없으면 창고 등록만.
// 탐색 탭과 동일하게 피드를 만들어 넘겨 검색 시에도 필터 바(카테고리·브랜드)를 유지·승계한다(SR-1).
const SearchPage = () => {
  const router = useRouter();
  // category: 피드 1차 카테고리 초기값(첫 여행 가이드 필수 장비 검색, OB-6).
  const { bagId, category } = useLocalSearchParams<{
    bagId?: string;
    category?: string;
  }>();
  const [searchWarehouse] = useState(() => SearchWarehouse.new(router));
  const [bag] = useState(() => Bag.new());
  const [feed] = useState(() => {
    const created = Feed.new(router);

    if (category) {
      created.presetCategory(category);
    }

    return created;
  });

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
      <LogInView logInAlertManager={app.getLogInAlertManager()!} />
      <AlertView alertManager={app.getAlertManager()!} />
      <ToastView toastManager={app.getToastManager()!} bottom={100} />
    </>
  );
};

export default observer(SearchPage);
