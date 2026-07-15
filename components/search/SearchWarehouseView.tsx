import { observer } from 'mobx-react-lite';
import React, { FC } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import Bag from '@/model/bag/Bag';
import { GearAddContext } from '@/model/gear/GearAddContext';
import SearchBarView from './SearchBarView';
import SearchResultView from './SearchResultView';

interface Props {
  searchWarehouse: SearchWarehouse;
  bag: Bag;
  gearAddContext?: GearAddContext | undefined;
  children?: React.ReactNode;
}

const SearchWarehouseView: FC<Props> = ({
  searchWarehouse,
  bag,
  gearAddContext,
}) => {
  return (
    <View style={styles.container}>
      <SearchBarView searchWarehouse={searchWarehouse} />
      <SearchResultView
        searchWarehouse={searchWarehouse}
        bag={bag}
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
    backgroundColor: 'white',
    paddingTop: Platform.OS === 'android' ? 16 : 0,
  },
});

export default observer(SearchWarehouseView);
