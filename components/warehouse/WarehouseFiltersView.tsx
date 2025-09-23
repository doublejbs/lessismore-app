import React, { FC } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import Warehouse from '@/model/warehouse/Warehouse';
import WarehouseFilter from '@/model/warehouse/WarehouseFilter';
import { observer } from 'mobx-react-lite';
import OrderButtonView from '@/components/order/OrderButtonView';

interface Props {
  warehouse: Warehouse;
}

const WarehouseFiltersView: FC<Props> = ({ warehouse }) => {
  const order = warehouse.getOrder();

  const handleClick = (filter: WarehouseFilter) => {
    warehouse.toggleFilter(filter);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {warehouse.mapFilters(filter => {
          const isSelected = filter.isSelected();
          return (
            <TouchableOpacity
              key={filter.getName()}
              style={[
                styles.filterButton,
                { backgroundColor: isSelected ? 'black' : '#EBEBEB' },
              ]}
              onPress={() => handleClick(filter)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  { color: isSelected ? 'white' : 'black' },
                ]}
              >
                {filter.getName()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <OrderButtonView order={order} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'white',
    zIndex: 10,
  },
  scrollView: {
    height: 40,
    flex: 1,
  },
  scrollContent: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 0,
  },
  filterButton: {
    height: 40,
    borderRadius: 22,
    paddingVertical: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonText: {
    fontSize: 14,
    lineHeight: 16,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});

export default observer(WarehouseFiltersView);
