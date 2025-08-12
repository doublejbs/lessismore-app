import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import SearchConfirmView from './SearchConfirmView';
import { observer } from 'mobx-react-lite';
import SearchSelectedView from './SearchSelectedView';

interface Props {
  searchWarehouse: SearchWarehouse;
}

const SearchBottomView: FC<Props> = ({ searchWarehouse }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <SearchSelectedView searchWarehouse={searchWarehouse} />
      <SearchConfirmView searchWarehouse={searchWarehouse} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    width: '100%',
    backgroundColor: 'white',
    gap: 4,
    position: 'absolute',
    bottom: 0,
    left: 0,
    zIndex: 10,
    paddingBottom: 12,
  },
});

export default observer(SearchBottomView);
