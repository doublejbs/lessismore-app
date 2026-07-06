import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import Gear from '@/model/gear/Gear';
import WarehouseFilter from '@/model/warehouse/WarehouseFilter';
import BagPacking from '@/model/bag-packing/BagPacking';
import BagPackingGearRowView from './BagPackingGearRowView';

interface Props {
  category: WarehouseFilter;
  gears: Gear[];
  bagPacking: BagPacking;
}

const BagPackingCategorySectionView: FC<Props> = ({
  category,
  gears,
  bagPacking,
}) => {
  return (
    <View style={styles.container}>
      <PretendardText style={styles.categoryTitle} weight='bold'>
        {category.getName()}
      </PretendardText>
      <View style={styles.gearList}>
        {gears.map(gear => (
          <BagPackingGearRowView
            key={gear.getId()}
            gear={gear}
            bagPacking={bagPacking}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  categoryTitle: {
    fontSize: 18,
    marginBottom: 12,
    color: '#333',
  },
  gearList: {
    gap: 16,
  },
});

export default observer(BagPackingCategorySectionView);
