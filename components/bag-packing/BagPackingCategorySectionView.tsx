import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import Gear from '@/model/gear/Gear';
import WarehouseFilter from '@/model/warehouse/WarehouseFilter';
import BagPacking from '@/model/bag-packing/BagPacking';
import BagPackingGearRowView from './BagPackingGearRowView';
import { Acg, AcgType } from '@/constants/DesignTokens';

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
        {category.getLabel()}
      </PretendardText>
      <View style={styles.gearList}>
        {gears.map((gear, index) => (
          <BagPackingGearRowView
            key={gear.getId()}
            gear={gear}
            bagPacking={bagPacking}
            divided={index > 0}
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
  // 묶음 안 라벨이라 섹션 제목보다 한 단 작다 — 홈·배낭 상세와 같은 값이다(HM-8).
  categoryTitle: {
    ...AcgType.rowSubtitle,
    marginBottom: 2,
    color: Acg.textMuted,
  },
  // 행이 각자 종이 면이라 홈 목록과 같은 8px로 벌린다.
  gearList: {
    // 행 사이 간격은 두지 않는다 — 헤어라인이 가른다.
    gap: 0,
  },
});

export default observer(BagPackingCategorySectionView);
