import React, { FC } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Warehouse from '@/model/warehouse/Warehouse';
import WarehouseFilter from '@/model/warehouse/WarehouseFilter';
import { observer } from 'mobx-react-lite';
import OrderButtonView from '@/components/order/OrderButtonView';
import OrderOption from '@/model/order/OrderOption';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';
import app from '@/model/app/App';

interface Props {
  warehouse: Warehouse;
}

const WarehouseFiltersView: FC<Props> = ({ warehouse }) => {
  const order = warehouse.getOrder();
  const totalCount = warehouse.getGears().length;

  const handleClick = (filter: WarehouseFilter) => {
    app
      .getAnalyticsManager()
      ?.logClick('warehouse_filter', { category: filter.getName() });
    warehouse.toggleFilter(filter);
  };

  const handleSelectOrder = (option: OrderOption) => {
    app
      .getAnalyticsManager()
      ?.logClick('warehouse_sort', { order: option.getName() });
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
                {
                  backgroundColor: isSelected
                    ? Color.chipActiveBg
                    : Color.chipInactiveBg,
                },
              ]}
              onPress={() => handleClick(filter)}
            >
              <PretendardText
                style={[
                  styles.filterButtonText,
                  { color: isSelected ? Color.background : Color.textPrimary },
                ]}
              >
                {filter.getName()}
              </PretendardText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <View style={styles.orderContainer}>
        <PretendardText weight='semibold' style={styles.titleText}>
          총 {totalCount}개
        </PretendardText>
        <OrderButtonView order={order} onSelectOption={handleSelectOrder} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    gap: 4,
    backgroundColor: Color.background,
  },
  scrollView: {
    height: 32,
    width: '100%',
  },
  scrollContent: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 0,
  },
  orderContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 16,
    color: Color.textPrimary,
  },
  filterButton: {
    height: 32,
    borderRadius: Radius.chip,
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
    textAlign: 'center',
  },
});

export default observer(WarehouseFiltersView);
