import { FC, useState } from 'react';
import { observer } from 'mobx-react-lite';
import Warehouse from '@/model/warehouse/Warehouse';
import WarehouseDispatcher from '@/model/warehouse/WarehouseDispatcher';
import GearFilter from '@/model/gear/GearFilter';
import app from '@/model/app/App';
import WarehouseScreen from '@/components/warehouse/WarehouseScreen';
import LoadingIconView from '../ui/LoadingIconView';

interface Props {
  // 홈 미리보기에서 좁힌 1차 카테고리. 첫 조회부터 이 카테고리로 나간다.
  initialCategory?: GearFilter | undefined;
  // 홈 `내 기록`(HM-7)의 안 쓴 장비 수로 들어온 경우. 필터를 켠 채로 연다.
  initialUnusedOnly?: boolean;
}

const WarehouseWrapper: FC<Props> = ({
  initialCategory,
  initialUnusedOnly = false,
}) => {
  const [warehouse] = useState(() => {
    const created = Warehouse.from(
      WarehouseDispatcher.new(),
      app.getToastManager()!,
      app.getFirebase()
    );

    // initialize()보다 먼저 세워야 첫 조회가 이 카테고리로 나간다.
    if (initialCategory) {
      created.applyInitialFilter(initialCategory);
    }

    if (initialUnusedOnly) {
      created.toggleUnusedOnly();
    }

    return created;
  });
  const isFirebaseInitialized = warehouse.isFirebaseInitialized();

  if (isFirebaseInitialized) {
    return <WarehouseScreen warehouse={warehouse} />;
  } else {
    return <LoadingIconView />;
  }
};

export default observer(WarehouseWrapper);
