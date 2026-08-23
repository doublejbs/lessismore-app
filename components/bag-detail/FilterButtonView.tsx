import { observer } from 'mobx-react-lite';
import { FC, useRef, useEffect } from 'react';
import { View } from 'react-native';
import WarehouseFilter from '@/model/warehouse/WarehouseFilter';
import FeedChipView from '@/components/feed/FeedChipView';

interface BagWithFilters {
  toggleFilterWithScroll: (filter: WarehouseFilter) => void;
}

interface Props {
  filter: WarehouseFilter;
  label: string;
  bagDetail: BagWithFilters;
  onRef?: (ref: any) => void;
}

const FilterButtonView: FC<Props> = ({ filter, bagDetail, label, onRef }) => {
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
    <FeedChipView
      ref={viewRef}
      label={label}
      selected={filter.isSelected()}
      onPress={handlePress}
    />
  );
};

export default observer(FilterButtonView);
