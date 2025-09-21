import { observer } from 'mobx-react-lite';
import { FC } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import WarehouseFilter from '@/model/warehouse/WarehouseFilter';

interface BagWithFilters {
  toggleFilterWithScroll: (filter: WarehouseFilter) => void;
}

interface Props {
  filter: WarehouseFilter;
  bagDetail: BagWithFilters;
}

const FilterButtonView: FC<Props> = ({ filter, bagDetail }) => {
  const isSelected = filter.isSelected();

  const handlePress = () => {
    bagDetail.toggleFilterWithScroll(filter);
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: isSelected ? 'black' : '#EBEBEB' },
      ]}
      onPress={handlePress}
    >
      <Text
        style={[styles.buttonText, { color: isSelected ? 'white' : 'black' }]}
      >
        {filter.getName()}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 32,
    borderRadius: 22,
    paddingVertical: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
  },
});

export default observer(FilterButtonView);
