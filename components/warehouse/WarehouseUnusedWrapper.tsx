import { FC, useState } from 'react';
import { observer } from 'mobx-react-lite';
import Warehouse from '@/model/warehouse/Warehouse';
import WarehouseDispatcher from '@/model/warehouse/WarehouseDispatcher';
import app from '@/model/app/App';
import WarehouseUnusedScreen from '@/components/warehouse/WarehouseUnusedScreen';
import LoadingIconView from '../ui/LoadingIconView';

/**
 * WH-2-1 `안 쓴 장비` 전용 화면의 3단 래퍼.
 *
 * 창고와 **같은 `Warehouse` 모델**을 쓰되 사용 여부 필터를 켠 채로 1회 생성한다 —
 * 사용률 0% 판정도, 목록 조회도 창고 것을 그대로 쓴다(복제하지 않는다).
 * 이 화면에는 카테고리·정렬·검색 UI가 없으므로 필터는 `전체`로 둔다.
 */
const WarehouseUnusedWrapper: FC = () => {
  const [warehouse] = useState(() => {
    const created = Warehouse.from(
      WarehouseDispatcher.new(),
      app.getToastManager()!,
      app.getFirebase()
    );

    created.toggleUnusedOnly();

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
