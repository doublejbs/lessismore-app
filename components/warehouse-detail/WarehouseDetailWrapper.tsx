import { FC, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import WarehouseDetailView from './WarehouseDetailView';
import WarehouseDetail from '../../model/warehouse-detail/WarehouseDetail';
import { useLocalSearchParams, useRouter } from 'expo-router';
import WarehouseDispatcher from '../../model/warehouse/WarehouseDispatcher';
import AlertView from '../alert/AlertView';
import app from '@/model/app/App';

interface Props {}

const WarehouseDetailWrapper: FC<Props> = ({}) => {
  const navigate = useRouter();
  const [warehouseDetail] = useState(() =>
    WarehouseDetail.new(navigate, WarehouseDispatcher.new())
  );
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const initialized = warehouseDetail.isInitialized();

  useEffect(() => {
    warehouseDetail.initialize(id);
  }, [id]);

  if (initialized) {
    return (
      <>
        <WarehouseDetailView warehouseDetail={warehouseDetail} />
        <AlertView alertManager={app.getAlertManager()!} />
      </>
    );
  } else {
    return null;
  }
};

export default observer(WarehouseDetailWrapper);
