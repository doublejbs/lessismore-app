import { FC, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Browse from '@/model/browse/Browse';
import Bag from '@/model/bag/Bag';
import BrowseSort from '@/model/search/BrowseSort';
import { getBrowseCategoryName } from '@/model/browse/BrowseCategory';
import Layout from '../Layout';
import BrowseListView from './BrowseListView';

// LG-1: iOS는 네이티브 투명 헤더가 상단을 덮고 스크롤 뷰가 자동 인셋을 받으므로
// top 세이프에어리어를 빼 이중 인셋을 막는다. 하단은 기존 동작 유지.
const IOS_EDGES = ['left', 'right', 'bottom'] as const;

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
    <Layout
      paddingHorizontal={0}
      edges={Platform.OS === 'ios' ? IOS_EDGES : undefined}
    >
      <BrowseListView
        browse={browse}
        bag={bag}
        title={getTitle(category, brand)}
      />
    </Layout>
  );
};

export default observer(BrowseWrapper);
