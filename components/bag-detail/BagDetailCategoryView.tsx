import { FC, useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Gear from '@/model/gear/Gear';
import WarehouseFilter from '@/model/warehouse/WarehouseFilter';
import BagDetailGearView from './BagDetailGearView';
import BagDetail from '@/model/bag-detail/BagDetail';
import LiquidSectionLabel from '@/components/liquid/LiquidSectionLabel';
import { LiquidRadius, LiquidShadow } from '@/constants/DesignTokens';

interface Props {
  category: WarehouseFilter;
  gears: Gear[];
  bagDetail: BagDetail;
  onRefReady?: (categoryFilter: string, ref: View | null) => void;
}

/**
 * BD-1 카테고리 그룹. 마이크로 섹션 라벨 + 그 카테고리의 장비 행을 담은 흰 카드 하나
 * (핸드오프 §6: 칩 줄 → MetricRow 카드).
 */
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
    <View ref={categoryRef}>
      <LiquidSectionLabel>{category.getName()}</LiquidSectionLabel>
      {/* 그림자는 껍데기가 든다 — 안쪽에서 모서리를 깎으므로(overflow: hidden) 같은 뷰에
          그림자를 걸면 자기 경계에서 잘린다. */}
      <View style={styles.cardShell}>
        <View style={styles.cardClip}>
          {gears.map((gear, index) => (
            <BagDetailGearView
              key={gear.getId()}
              gear={gear}
              bagDetail={bagDetail}
              divider={index > 0}
            />
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardShell: {
    borderRadius: LiquidRadius.card,
    boxShadow: LiquidShadow.card,
  },
  // 스와이프 액션 면이 카드 밖으로 새지 않게 여기서 깎는다.
  cardClip: {
    borderRadius: LiquidRadius.card,
    overflow: 'hidden',
  },
});

export default BagDetailCategoryView;
