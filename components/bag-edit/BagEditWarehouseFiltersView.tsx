import { observer } from 'mobx-react-lite';
import { FC } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import OrderButtonView from '../order/OrderButtonView';
import GearFilter from '../../model/gear/GearFilter';
import WarehouseFilter from '../../model/warehouse/WarehouseFilter';
import BagEdit from '../../model/bag-edit/BagEdit';
import LiquidChip from '@/components/liquid/LiquidChip';
import { LiquidLayout } from '@/constants/DesignTokens';

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
            <LiquidChip
              // 개수는 별도 배지가 아니라 라벨에 붙인다 — 숫자는 그것이 세는 대상과 한
              // 덩어리로 읽혀야 하고(카피 규칙), 칩 안에 배지를 겹치면 알약이 두꺼워진다.
              key={filter.getName()}
              label={
                isAll
                  ? filter.getName()
                  : `${filter.getName()} ${filter.getCount()}`
              }
              selected={filter.isSelected()}
              onPress={() => handlePress(filter)}
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
    gap: 8,
  },
  /**
   * 칩 줄은 화면 좌우로 블리드시킨다 — 스크롤이 가장자리에서 끊기지 않게(목업 §8).
   * 폭을 지정하지 않는다: `width: '100%'`를 주면 음수 마진만큼 오른쪽이 잘려 마지막 칩이
   * 화면 안에서 끝난다(창고 필터 줄과 같은 처리).
   */
  scrollContainer: {
    marginHorizontal: -LiquidLayout.screenH,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: LiquidLayout.screenH,
  },
  orderContainer: {
    width: '100%',
    alignItems: 'flex-end',
  },
});

export default observer(BagEditWarehouseFiltersView);
