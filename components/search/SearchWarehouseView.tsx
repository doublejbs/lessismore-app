import { observer } from 'mobx-react-lite';
import React, { FC } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Acg } from '@/constants/DesignTokens';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import Bag from '@/model/bag/Bag';
import Feed from '@/model/feed/Feed';
import { GearAddContext } from '@/model/gear/GearAddContext';
import useSearchFilterInheritance from '@/hooks/useSearchFilterInheritance';
import SheetGrabberView from '@/components/ui/SheetGrabberView';
import SearchBarView from './SearchBarView';
import SearchBarVariant from './SearchBarVariant';
import SearchResultView from './SearchResultView';

interface Props {
  searchWarehouse: SearchWarehouse;
  bag: Bag;
  feed: Feed;
  gearAddContext?: GearAddContext | undefined;
  children?: React.ReactNode;
}

// 장비 추가 검색 모달(GE-8). 목록형 시트라 그래버로 이탈하고, 검색창은 Plain 문법을 쓴다(SR-10).
// 탐색 탭과 동일하게 검색 승계(SR-1)를 배선해 검색 시에도 필터 바를 유지한다.
const SearchWarehouseView: FC<Props> = ({
  searchWarehouse,
  bag,
  feed,
  gearAddContext,
}) => {
  useSearchFilterInheritance(searchWarehouse, feed);

  return (
    <View style={styles.container}>
      <SheetGrabberView />
      <SearchBarView
        searchWarehouse={searchWarehouse}
        variant={SearchBarVariant.Plain}
      />
      <SearchResultView
        searchWarehouse={searchWarehouse}
        bag={bag}
        feed={feed}
        gearAddContext={gearAddContext}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    width: '100%',
    backgroundColor: Acg.bg,
    paddingTop: Platform.OS === 'android' ? 16 : 0,
  },
});

export default observer(SearchWarehouseView);
