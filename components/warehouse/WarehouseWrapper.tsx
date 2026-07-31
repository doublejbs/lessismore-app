import { FC, useState } from 'react';
import { observer } from 'mobx-react-lite';
import Warehouse from '@/model/warehouse/Warehouse';
import WarehouseDispatcher from '@/model/warehouse/WarehouseDispatcher';
import GearFilter from '@/model/gear/GearFilter';
import app from '@/model/app/App';
import WarehouseScreen from '@/components/warehouse/WarehouseScreen';
import LoadingIconView from '../ui/LoadingIconView';

interface Props {
  /**
   * 홈에서 들어온 푸시 화면이면 true — 타이틀 앞에 뒤로 가기를 그린다(HM-4).
   * 탭 루트로 쓰일 때는 돌아갈 곳이 없어 그리지 않는다.
   */
  showBack?: boolean;
  // 홈 미리보기에서 좁힌 1차 카테고리. 첫 조회부터 이 카테고리로 나간다.
  initialCategory?: GearFilter | undefined;
}

const WarehouseWrapper: FC<Props> = ({ showBack = false, initialCategory }) => {
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

    return created;
  });
  const isFirebaseInitialized = warehouse.isFirebaseInitialized();

  if (isFirebaseInitialized) {
    return <WarehouseScreen warehouse={warehouse} showBack={showBack} />;
  } else {
    return <LoadingIconView />;
  }
};

export default observer(WarehouseWrapper);
