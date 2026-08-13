import { FC, useState } from 'react';
import { observer } from 'mobx-react-lite';
import Warehouse from '@/model/warehouse/Warehouse';
import WarehouseDispatcher from '@/model/warehouse/WarehouseDispatcher';
import GearFilter from '@/model/gear/GearFilter';
import app from '@/model/app/App';
import WarehouseUnusedScreen from '@/components/warehouse/WarehouseUnusedScreen';
import LoadingIconView from '../ui/LoadingIconView';

interface Props {
  // 창고에서 승계한 1차 카테고리(WH-2-1). 없으면 `전체`로 열린다.
  initialCategory?: GearFilter | undefined;
}

/**
 * WH-2-1 `안 쓴 장비` 전용 화면의 3단 래퍼.
 *
 * 창고와 **같은 `Warehouse` 모델**을 쓰되 사용 여부 필터를 켠 채로 1회 생성한다 —
 * 사용률 0% 판정도, 카테고리 조회도 창고 것을 그대로 쓴다(복제하지 않는다).
 * 이 화면에는 정렬·검색 UI가 없으므로 그 축은 건드리지 않고, 1차 카테고리만
 * 칩 행으로 노출한다(세분 칩 없음).
 */
const WarehouseUnusedWrapper: FC<Props> = ({ initialCategory }) => {
  const [warehouse] = useState(() => {
    const created = Warehouse.from(
      WarehouseDispatcher.new(),
      app.getToastManager()!,
      app.getFirebase()
    );

    created.toggleUnusedOnly();

    // initialize()보다 먼저 세워야 첫 조회가 승계된 카테고리로 나간다(창고 래퍼와 동일).
    if (initialCategory) {
      created.applyInitialFilter(initialCategory);
    }

    return created;
  });
  const isFirebaseInitialized = warehouse.isFirebaseInitialized();

  if (isFirebaseInitialized) {
    return <WarehouseUnusedScreen warehouse={warehouse} />;
  } else {
    return <LoadingIconView />;
  }
};

export default observer(WarehouseUnusedWrapper);
