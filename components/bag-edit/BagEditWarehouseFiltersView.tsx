import { observer } from 'mobx-react-lite';
import { FC } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { AcgLayout } from '@/constants/DesignTokens';
import OrderButtonView from '../order/OrderButtonView';
import GearFilter from '../../model/gear/GearFilter';
import WarehouseFilter from '../../model/warehouse/WarehouseFilter';
import BagEdit from '../../model/bag-edit/BagEdit';
import CategoryChipView from '@/components/browse/CategoryChipView';

interface Props {
  bagEdit: BagEdit;
}

const BagEditWarehouseFiltersView: FC<Props> = ({ bagEdit }) => {
  const order = bagEdit.getOrder();

  const handlePress = (filter: WarehouseFilter) => {
    bagEdit.toggleFilter(filter);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
      >
        {bagEdit.mapFilters(filter => {
          const isAll = filter.getFilter() === GearFilter.All;

          return (
            <CategoryChipView
              key={filter.getFilter()}
              label={filter.getLabel()}
              selected={filter.isSelected()}
              onPress={() => handlePress(filter)}
              {...(isAll ? {} : { count: filter.getCount() })}
            />
          );
        })}
      </ScrollView>
      <View style={styles.orderContainer}>
        <OrderButtonView order={order} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    gap: 4,
  },
  scrollContainer: {
    width: '100%',
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AcgLayout.chipGap,
  },
  orderContainer: {
    width: '100%',
    alignItems: 'flex-end',
  },
});

export default observer(BagEditWarehouseFiltersView);
