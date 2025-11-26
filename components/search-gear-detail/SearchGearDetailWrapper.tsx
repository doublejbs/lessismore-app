import { FC, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import SearchGearDetailView from './SearchGearDetailView';
import SearchGearDetail from '@/model/search/SearchGearDetail';
import { useLocalSearchParams, useRouter } from 'expo-router';
import WarehouseDispatcher from '@/model/warehouse/WarehouseDispatcher';
import Layout from '../Layout';
import SearchGearDetailAddToBagModalView from '../search/SearchGearAddToBagModalView';
import Bag from '@/model/bag/Bag';

interface Props {}

const SearchGearDetailWrapper: FC<Props> = ({}) => {
  const navigate = useRouter();
  const [searchGearDetail] = useState(() =>
    SearchGearDetail.new(navigate, WarehouseDispatcher.new())
  );
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const initialized = searchGearDetail.isInitialized();
  const [bag] = useState(() => Bag.new());
  const showAddToBagModal = searchGearDetail.shouldShowAddToBagModal();
  const gear = searchGearDetail.getGear();

  const handleCloseModal = () => {
    searchGearDetail.closeAddToBagModal();
  };

  useEffect(() => {
    searchGearDetail.initialize(id);
  }, [id]);

  if (initialized) {
    return (
      <Layout paddingHorizontal={0}>
        <SearchGearDetailView searchGearDetail={searchGearDetail} />
        {gear && (
          <SearchGearDetailAddToBagModalView
            visible={showAddToBagModal}
            onClose={handleCloseModal}
            gear={gear}
            bag={bag}
          />
        )}
      </Layout>
    );
  } else {
    return null;
  }
};

export default observer(SearchGearDetailWrapper);
