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
  /**
   * 카테고리 머리 라벨을 그릴지. 담긴 장비가 **한 카테고리뿐이면** 라벨이 가르는 것이 없는데도
   * 행 하나만큼 자리를 쓴다 — 호출부가 카테고리 수를 보고 끈다(2026-08-11 개정).
   */
  showLabel?: boolean;
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
  showLabel = true,
}) => {
  return (
    <View>
      {showLabel ? (
        <LiquidSectionLabel>{category.getName()}</LiquidSectionLabel>
      ) : null}
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
