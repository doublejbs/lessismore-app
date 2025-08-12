import { observer } from 'mobx-react-lite';
import React, { FC } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import SearchBarView from './SearchBarView';
import SearchBottomView from './SearchBottomView';
import SearchResultView from './SearchResultView';
import LogInView from '../login/LogInView';
import app from '@/model/app/App';

interface Props {
  searchWarehouse: SearchWarehouse;
  children?: React.ReactNode;
}

const SearchWarehouseView: FC<Props> = ({ searchWarehouse }) => {
  return (
    <View style={styles.container}>
      <SearchBarView searchWarehouse={searchWarehouse} />
      <SearchResultView searchWarehouse={searchWarehouse} />
      <SearchBottomView searchWarehouse={searchWarehouse} />
      <LogInView logInAlertManager={app.getLogInAlertManager()!} />
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
