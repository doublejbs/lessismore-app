import React, { FC } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import Warehouse from '@/model/warehouse/Warehouse';
import WarehouseFilter from '@/model/warehouse/WarehouseFilter';
import { observer } from 'mobx-react-lite';
import OrderButtonView from '@/components/order/OrderButtonView';
import OrderOption from '@/model/order/OrderOption';
import PretendardText from '@/components/PretendardText';
import CategoryChipView from '@/components/browse/CategoryChipView';
import { getFineCategoryLabel } from '@/model/gear/GearCategoryGroups';
import { Color } from '@/constants/DesignTokens';
import app from '@/model/app/App';

interface Props {
  warehouse: Warehouse;
}

const WarehouseFiltersView: FC<Props> = ({ warehouse }) => {
  const order = warehouse.getOrder();
  const totalCount = warehouse.getGears().length;
  const fineCategoryOptions = warehouse.getFineCategoryOptions();
  const fineCategory = warehouse.getFineCategory();

  const handleClick = (filter: WarehouseFilter) => {
    app
      .getAnalyticsManager()
      ?.logClick('warehouse_filter', { category: filter.getName() });
    warehouse.toggleFilter(filter);
  };

  // 세분 칩 탭 — 전체 칩은 null, 재탭 토글은 Warehouse가 처리한다
  const handleClickFineCategory = (key: string | null) => {
    app
      .getAnalyticsManager()
      ?.logClick('warehouse_fine_filter', { category: key ?? 'all' });
    warehouse.selectFineCategory(key);
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
      {fineCategoryOptions.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.scrollView}
          contentContainerStyle={styles.fineScrollContent}
        >
          <CategoryChipView
            label='전체'
            selected={fineCategory === null}
            onPress={() => handleClickFineCategory(null)}
          />
          {fineCategoryOptions.map(key => (
            <CategoryChipView
              key={key}
              label={getFineCategoryLabel(key)}
              selected={fineCategory === key}
              onPress={() => handleClickFineCategory(key)}
            />
          ))}
        </ScrollView>
      )}
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
    width: '100%',
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 0,
  },
  // 세분 칩 행 — 1차 행과 구분되게 보조적으로(간격 축소) 배치
  fineScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
});

export default observer(WarehouseFiltersView);
