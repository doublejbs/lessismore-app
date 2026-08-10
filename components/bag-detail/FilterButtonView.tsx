import { observer } from 'mobx-react-lite';
import { FC, useRef, useEffect } from 'react';
import { View } from 'react-native';
import WarehouseFilter from '@/model/warehouse/WarehouseFilter';
import LiquidChip from '@/components/liquid/LiquidChip';

interface BagWithFilters {
  toggleFilterWithScroll: (filter: WarehouseFilter) => void;
}

interface Props {
  filter: WarehouseFilter;
  bagDetail: BagWithFilters;
  onRef?: (ref: any) => void;
}

// BD-2 카테고리 필터 칩 하나. 스크롤 동기화(칩 → 섹션, 섹션 → 칩)를 위해 칩을 감싼
// 래퍼 View의 ref를 넘긴다 — 측정 대상이 필요해 칩 자체가 아니라 래퍼를 잡는다.
const FilterButtonView: FC<Props> = ({ filter, bagDetail, onRef }) => {
  const viewRef = useRef<View>(null);

  useEffect(() => {
    if (onRef && viewRef.current) {
      onRef(viewRef.current);
    }
  }, [onRef]);

  const handlePress = () => {
    bagDetail.toggleFilterWithScroll(filter);
  };

  return (
    <View ref={viewRef}>
      <LiquidChip
        label={filter.getName()}
        selected={filter.isSelected()}
        onPress={handlePress}
      />
    </View>
  );
};

export default observer(FilterButtonView);
