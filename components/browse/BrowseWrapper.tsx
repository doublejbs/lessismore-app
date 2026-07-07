import { FC, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Browse from '@/model/browse/Browse';
import Bag from '@/model/bag/Bag';
import BrowseSort from '@/model/search/BrowseSort';
import { getBrowseCategoryName } from '@/model/browse/BrowseCategory';
import Layout from '../Layout';
import BrowseListView from './BrowseListView';

const parseSort = (value: string | undefined): BrowseSort => {
  switch (value) {
    case BrowseSort.Popular:
    case BrowseSort.Latest:
    case BrowseSort.WeightAsc:
    case BrowseSort.WeightDesc: {
      return value;
    }
    default: {
      return BrowseSort.Popular;
    }
  }
};

const getTitle = (category: string, brand: string): string => {
  if (brand) {
    return brand;
  }

  if (category) {
    return getBrowseCategoryName(category);
  }

  return '신제품';
};

const BrowseWrapper: FC = () => {
  const router = useRouter();
  const {
    category = '',
    brand = '',
    sort,
  } = useLocalSearchParams<{
    category?: string;
    brand?: string;
    sort?: string;
  }>();
  const [browse] = useState(() =>
    Browse.new(router, category, brand, parseSort(sort))
  );
  const [bag] = useState(() => Bag.new());
  const initialized = browse.isInitialized();

  useEffect(() => {
    browse.initialize();

    return () => {
      browse.dispose();
    };
  }, [browse]);

  if (!initialized) {
    return null;
  }

  return (
    <Layout paddingHorizontal={0}>
      <BrowseListView
        browse={browse}
        bag={bag}
        title={getTitle(category, brand)}
      />
    </Layout>
  );
};

export default observer(BrowseWrapper);
