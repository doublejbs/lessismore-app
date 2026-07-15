import { observer } from 'mobx-react-lite';
import SearchWarehouseView from '@/components/search/SearchWarehouseView';
import { useState } from 'react';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import Bag from '@/model/bag/Bag';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AlertView from '@/components/alert/AlertView';
import app from '@/model/app/App';
import LogInView from '@/components/login/LogInView';
import ToastView from '@/components/toast/ToastView';
import { GearAddContext } from '@/model/gear/GearAddContext';
import GearAddMode from '@/model/gear/GearAddMode';

// GE-8: 장비 추가 `검색으로 추가` 진입 모달. bagId가 있으면 그 배낭에 바로 담고, 없으면 창고 등록만.
const SearchPage = () => {
  const router = useRouter();
  const { bagId } = useLocalSearchParams<{ bagId?: string }>();
  const [searchWarehouse] = useState(() => SearchWarehouse.new(router));
  const [bag] = useState(() => Bag.new());

  const gearAddContext: GearAddContext = bagId
    ? { mode: GearAddMode.Bag, bagId }
    : { mode: GearAddMode.Warehouse };

  return (
    <>
      <SearchWarehouseView
        searchWarehouse={searchWarehouse}
        bag={bag}
        gearAddContext={gearAddContext}
      />
      <LogInView logInAlertManager={app.getLogInAlertManager()!} />
      <AlertView alertManager={app.getAlertManager()!} />
      <ToastView toastManager={app.getToastManager()!} bottom={100} />
    </>
  );
};

export default observer(SearchPage);
