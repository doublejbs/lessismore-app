import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import Gear from '@/model/gear/Gear';
import WarehouseFilter from '@/model/warehouse/WarehouseFilter';
import BagPacking from '@/model/bag-packing/BagPacking';
import BagPackingGearRowView from './BagPackingGearRowView';
import { Acg } from '@/constants/DesignTokens';

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
  // 지면 위 섹션 제목 — 홈·배낭 상세와 같은 18px/700 textTertiary(ACG).
  categoryTitle: {
    fontSize: 18,
    marginBottom: 10,
    color: Acg.textTertiary,
  },
  // 행이 각자 종이 면이라 홈 목록과 같은 8px로 벌린다.
  gearList: {
    gap: 8,
  },
});

export default observer(BagPackingCategorySectionView);
