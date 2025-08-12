import { FC } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import { observer } from 'mobx-react-lite';
import SearchBarInputView from './SearchInputView';

interface Props {
  searchWarehouse: SearchWarehouse;
}

const SearchBarView: FC<Props> = ({ searchWarehouse }) => {
  const keyword = searchWarehouse.getKeyword();

  const handleClickClear = () => {
    searchWarehouse.clearKeyword();
  };

  const handleClickBack = () => {
    searchWarehouse.back();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={handleClickBack}>
        <Ionicons name='chevron-back' size={24} color='#191F28' />
      </TouchableOpacity>
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
    paddingLeft: 10,
    paddingRight: 20,
    paddingTop: 16,
    paddingBottom: 16,
    height: 80,
    backgroundColor: 'white',
    gap: 12,
  },
  backButton: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  searchContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#F6F6F6',
  },
});

export default observer(SearchBarView);
