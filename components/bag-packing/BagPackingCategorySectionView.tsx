import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import Gear from '@/model/gear/Gear';
import WarehouseFilter from '@/model/warehouse/WarehouseFilter';
import BagPacking from '@/model/bag-packing/BagPacking';
import BagPackingGearRowView from './BagPackingGearRowView';
import LiquidSectionLabel from '@/components/liquid/LiquidSectionLabel';
import { LiquidLayout } from '@/constants/DesignTokens';

interface Props {
  category: WarehouseFilter;
  gears: Gear[];
  bagPacking: BagPacking;
}

/**
 * PK-2 카테고리 그룹. 마이크로 섹션 라벨 + 그 카테고리의 행 카드들(목업 §7).
 *
 * 배낭 상세와 달리 행을 한 카드에 묶지 않는다 — 행마다 면이 갈려야(흰 면 ↔ 가라앉은 면)
 * 무엇을 챙겼는지 한눈에 스캔된다.
 */
const BagPackingCategorySectionView: FC<Props> = ({
  category,
  gears,
  bagPacking,
}) => {
  return (
    <View>
      <LiquidSectionLabel>{category.getName()}</LiquidSectionLabel>
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
  gearList: {
    gap: LiquidLayout.listGap,
  },
});

export default observer(BagPackingCategorySectionView);
