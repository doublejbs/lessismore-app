import { observer } from 'mobx-react-lite';
import { FC, useRef, useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import WarehouseFilter from '@/model/warehouse/WarehouseFilter';

interface BagWithFilters {
  toggleFilterWithScroll: (filter: WarehouseFilter) => void;
}

interface Props {
  filter: WarehouseFilter;
  bagDetail: BagWithFilters;
  onRef?: (ref: any) => void;
}

const FilterButtonView: FC<Props> = ({ filter, bagDetail, onRef }) => {
  const isSelected = filter.isSelected();
  const viewRef = useRef<View>(null);

  useEffect(() => {
    if (onRef && viewRef.current) {
      onRef(viewRef.current);
    }
  }, [onRef]);

  const handlePress = () => {
    bagDetail.toggleFilterWithScroll(filter);
  };

  return (
    <View ref={viewRef}>
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
    </View>
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
    lineHeight: 16,
  },
});

export default observer(FilterButtonView);
