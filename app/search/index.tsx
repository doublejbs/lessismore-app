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
import { GearPickParams, takeGearPick } from '@/model/gear/GearPickHandoff';

// 담기 모드인데 받을 화면이 없을 때 — 아무것도 하지 않고 닫히기만 한다.
const INERT_GEAR_PICK: GearPickParams = {
  onPick: () => {},
  isPicked: () => false,
};

// GE-8: 장비 추가 `검색으로 추가` 진입 모달. bagId가 있으면 그 배낭에 바로 담고, 없으면 창고 등록만.
// 탐색 탭과 동일하게 피드를 만들어 넘겨 검색 시에도 필터 바(카테고리·브랜드)를 유지·승계한다(SR-1).
const SearchPage = () => {
  const router = useRouter();
  // category: 피드 1차 카테고리 초기값(첫 여행 가이드 필수 장비 검색, OB-6).
  // pick: 첫 여행 가이드 비로그인 담기 모드(OB-13) — 쓰기 없이 고른 장비를 가이드에 돌려준다.
  const { bagId, category, pick } = useLocalSearchParams<{
    bagId?: string;
    category?: string;
    pick?: string;
  }>();
  const [pickParams] = useState(() => (pick ? takeGearPick() : null));
  const [searchWarehouse] = useState(() => SearchWarehouse.new(router));
  const [bag] = useState(() => Bag.new());
  const [feed] = useState(() => {
    const created = Feed.new(router);

    if (category) {
      created.presetCategory(category);
    }

    return created;
  });

  const getGearAddContext = (): GearAddContext => {
    // pick 파라미터가 있으면 핸드오프가 비어 있어도(리로드 등) 창고 모드로 떨어지지 않는다 — 쓰기 없음 보장(OB-13).
    if (pick) {
      return {
        mode: GearAddMode.Pick,
        pick: pickParams ?? INERT_GEAR_PICK,
      };
    }

    return bagId
      ? { mode: GearAddMode.Bag, bagId }
      : { mode: GearAddMode.Warehouse };
  };

  const gearAddContext = getGearAddContext();

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
