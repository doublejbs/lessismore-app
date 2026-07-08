import { observer } from 'mobx-react-lite';
import { FC } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import PretendardText from '../PretendardText';
import OrderButtonView from '../order/OrderButtonView';
import GearFilter from '../../model/gear/GearFilter';
import WarehouseFilter from '../../model/warehouse/WarehouseFilter';
import BagEdit from '../../model/bag-edit/BagEdit';
import { Color, Radius } from '@/constants/DesignTokens';

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
          return filter.getFilter() === GearFilter.All ? (
            <TouchableOpacity
              key={filter.getName()}
              style={[
                styles.filterButton,
                styles.allFilterButton,
                {
                  backgroundColor: filter.isSelected()
                    ? Color.chipActiveBg
                    : Color.chipInactiveBg,
                },
              ]}
              onPress={() => handlePress(filter)}
              activeOpacity={0.7}
            >
              <PretendardText
                style={[
                  styles.filterText,
                  {
                    color: filter.isSelected()
                      ? Color.background
                      : Color.textPrimary,
                  },
                ]}
              >
                {filter.getName()}
              </PretendardText>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              key={filter.getName()}
              style={[
                styles.filterButton,
                styles.countFilterButton,
                {
                  backgroundColor: filter.isSelected()
                    ? Color.chipActiveBg
                    : Color.chipInactiveBg,
                },
              ]}
              onPress={() => handlePress(filter)}
              activeOpacity={0.7}
            >
              <PretendardText
                style={[
                  styles.filterText,
                  {
                    color: filter.isSelected()
                      ? Color.background
                      : Color.textPrimary,
                  },
                ]}
              >
                {filter.getName()}
              </PretendardText>
              <View style={styles.countBadge}>
                <PretendardText style={styles.countText}>
                  {filter.getCount()}
                </PretendardText>
              </View>
            </TouchableOpacity>
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
    height: 32,
  },
  scrollContent: {
    flexDirection: 'row',
    gap: 8,
  },
  orderContainer: {
    width: '100%',
    alignItems: 'flex-end',
  },
  filterButton: {
    height: 32,
    borderRadius: Radius.chip,
    justifyContent: 'center',
    alignItems: 'center',
  },
  allFilterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  countFilterButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  filterText: {
    fontSize: 14,
    lineHeight: 16,
  },
  countBadge: {
    backgroundColor: Color.background,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countText: {
    color: Color.textPrimary,
    fontSize: 12,
    lineHeight: 12,
  },
});

export default observer(BagEditWarehouseFiltersView);
