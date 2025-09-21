import { FC, useRef, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Gear from '@/model/gear/Gear';
import WarehouseFilter from '@/model/warehouse/WarehouseFilter';
import BagDetailGearView from './BagDetailGearView';
import BagDetail from '@/model/bag-detail/BagDetail';

interface Props {
  category: WarehouseFilter;
  gears: Gear[];
  bagDetail: BagDetail;
  onRefReady?: (categoryFilter: string, ref: View | null) => void;
}

const BagDetailCategoryView: FC<Props> = ({
  category,
  gears,
  bagDetail,
  onRefReady,
}) => {
  const categoryRef = useRef<View>(null);

  useEffect(() => {
    if (categoryRef.current && onRefReady) {
      onRefReady(category.getFilter(), categoryRef.current);
    }
  }, [category, onRefReady]);

  return (
    <View ref={categoryRef} style={styles.container}>
      <Text style={styles.categoryTitle}>{category.getName()}</Text>
      <View style={styles.gearList}>
        {gears.map(gear => (
          <BagDetailGearView
            key={gear.getId()}
            gear={gear}
            bagDetail={bagDetail}
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
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  gearList: {
    gap: 16,
  },
});

export default BagDetailCategoryView;
