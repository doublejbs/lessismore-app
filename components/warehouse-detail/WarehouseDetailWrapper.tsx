import { FC, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import WarehouseDetailView from './WarehouseDetailView';
import WarehouseDetail from '../../model/warehouse-detail/WarehouseDetail';
import { useLocalSearchParams, useRouter } from 'expo-router';
import WarehouseDispatcher from '../../model/warehouse/WarehouseDispatcher';
import Layout from '../Layout';

interface Props {}

const WarehouseDetailWrapper: FC<Props> = ({}) => {
  const navigate = useRouter();
  const [warehouseDetail] = useState(() =>
    WarehouseDetail.new(navigate, WarehouseDispatcher.new())
  );
  const { id = '', bagId } = useLocalSearchParams<{
    id: string;
    bagId?: string;
  }>();
  const initialized = warehouseDetail.isInitialized();

  useEffect(() => {
    // GE-8: 배낭 장비 추가 검색에서 들어오면 그 배낭 컨텍스트로 담기 버튼을 전환한다.
    if (bagId) {
      warehouseDetail.setBagContext(bagId);
    }

    warehouseDetail.initialize(id);
  }, [id, bagId]);

  if (initialized) {
    return (
      <Layout paddingHorizontal={0}>
        <WarehouseDetailView warehouseDetail={warehouseDetail} />
      </Layout>
    );
  } else {
    return null;
  }
};

export default observer(WarehouseDetailWrapper);
