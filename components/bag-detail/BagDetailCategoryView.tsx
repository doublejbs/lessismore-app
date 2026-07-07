import { FC, useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Gear from '@/model/gear/Gear';
import WarehouseFilter from '@/model/warehouse/WarehouseFilter';
import BagDetailGearView from './BagDetailGearView';
import BagDetail from '@/model/bag-detail/BagDetail';
import PretendardText from '@/components/PretendardText';
import { Color } from '@/constants/DesignTokens';

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
      <PretendardText style={styles.categoryTitle} weight='bold'>
        {category.getName()}
      </PretendardText>
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
    marginBottom: 12,
    color: Color.textTertiary,
  },
  gearList: {
    gap: 16,
  },
});

export default BagDetailCategoryView;
