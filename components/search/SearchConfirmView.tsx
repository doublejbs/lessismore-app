import { FC } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import { observer } from 'mobx-react-lite';

interface Props {
  searchWarehouse: SearchWarehouse;
}

const SearchConfirmView: FC<Props> = ({ searchWarehouse }) => {
  const selectedCount = searchWarehouse.getSelectedCount();

  const handlePress = () => {
    searchWarehouse.register();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: selectedCount > 0 ? 'black' : '#D5D8DF',
          },
        ]}
        onPress={handlePress}
      >
        <Text style={styles.buttonText}>
          {selectedCount > 0
            ? `${selectedCount}개 추가하기`
            : '추가할 장비를 선택해주세요'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingTop: 12,
    paddingHorizontal: 24,
  },
  button: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Pretendard-SemiBold',
  },
});

export default observer(SearchConfirmView);
