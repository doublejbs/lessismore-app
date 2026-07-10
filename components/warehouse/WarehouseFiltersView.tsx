import React, { FC } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import Warehouse from '@/model/warehouse/Warehouse';
import WarehouseFilter from '@/model/warehouse/WarehouseFilter';
import { observer } from 'mobx-react-lite';
import OrderButtonView from '@/components/order/OrderButtonView';
import OrderOption from '@/model/order/OrderOption';
import PretendardText from '@/components/PretendardText';
import CategoryChipView from '@/components/browse/CategoryChipView';
import { Color } from '@/constants/DesignTokens';
import app from '@/model/app/App';

interface Props {
  warehouse: Warehouse;
}

const formatWeight = (grams: number) => {
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(1)}kg`;
  }

  return `${grams}g`;
};

const WarehouseFiltersView: FC<Props> = ({ warehouse }) => {
  const order = warehouse.getOrder();
  const totalCount = warehouse.getGears().length;
  const totalWeight = warehouse.getTotalWeight();

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
        {warehouse.mapFilters(filter => (
          <CategoryChipView
            key={filter.getName()}
            label={filter.getName()}
            selected={filter.isSelected()}
            onPress={() => handleClick(filter)}
          />
        ))}
      </ScrollView>
      <View style={styles.orderContainer}>
        <PretendardText weight='semibold' style={styles.titleText}>
          총 {totalCount}개
          {totalWeight > 0 && (
            <PretendardText weight='semibold' style={styles.weightText}>
              {'  ·  '}
              {formatWeight(totalWeight)}
            </PretendardText>
          )}
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
    width: '100%',
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
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
  weightText: {
    fontSize: 16,
    color: Color.textSecondary,
  },
});

export default observer(WarehouseFiltersView);
