import { FC, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import Warehouse from '@/model/warehouse/Warehouse';
import WarehouseDispatcher from '@/model/warehouse/WarehouseDispatcher';
import app from '@/model/app/App';
import WarehouseScreen from '@/components/warehouse/WarehouseScreen';

interface Props {}

const WarehouseWrapper: FC<Props> = () => {
  const isLoggedIn = app.getFirebase().isLoggedIn();
  const [warehouse] = useState(() =>
    Warehouse.from(
      WarehouseDispatcher.new(),
      app.getToastManager()!,
      app.getFirebase()
    )
  );

  useFocusEffect(
    useCallback(() => {
      if (isLoggedIn) {
        warehouse.initialize();
      } else {
        warehouse.clear();
      }
    }, [warehouse, isLoggedIn])
  );

  return <WarehouseScreen warehouse={warehouse} />;
};

export default observer(WarehouseWrapper);
