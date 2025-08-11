import { FC, useState } from 'react';
import { observer } from 'mobx-react-lite';
import Warehouse from '@/model/warehouse/Warehouse';
import WarehouseDispatcher from '@/model/warehouse/WarehouseDispatcher';
import app from '@/model/app/App';
import WarehouseScreen from '@/components/warehouse/WarehouseScreen';

interface Props {}

const WarehouseWrapper: FC<Props> = () => {
  const [warehouse] = useState(() =>
    Warehouse.from(WarehouseDispatcher.new(), app.getToastManager()!, app.getFirebase())
  );

  return <WarehouseScreen warehouse={warehouse} />;
};

export default observer(WarehouseWrapper);  