import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import { observer } from 'mobx-react-lite';
import SearchBarInputView from './SearchInputView';

interface Props {
  searchWarehouse: SearchWarehouse;
}

const SearchBarView: FC<Props> = ({ searchWarehouse }) => {
  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <SearchBarInputView searchWarehouse={searchWarehouse} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
    paddingRight: 20,
    paddingTop: 16,
    paddingBottom: 16,
    height: 80,
    backgroundColor: 'white',
    gap: 4,
  },
  backButton: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  searchContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F6F6F6',
  },
});

export default observer(SearchBarView);
