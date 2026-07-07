import { observer } from 'mobx-react-lite';
import { FC, useRef, useEffect } from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import WarehouseFilter from '@/model/warehouse/WarehouseFilter';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';

interface BagWithFilters {
  toggleFilterWithScroll: (filter: WarehouseFilter) => void;
}

interface Props {
  filter: WarehouseFilter;
  bagDetail: BagWithFilters;
  onRef?: (ref: any) => void;
}

const FilterButtonView: FC<Props> = ({ filter, bagDetail, onRef }) => {
  const isSelected = filter.isSelected();
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
      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: isSelected
              ? Color.chipActiveBg
              : Color.chipInactiveBg,
          },
        ]}
        onPress={handlePress}
      >
        <PretendardText
          style={[
            styles.buttonText,
            { color: isSelected ? Color.background : Color.textPrimary },
          ]}
        >
          {filter.getName()}
        </PretendardText>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 32,
    borderRadius: Radius.chip,
    paddingVertical: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
    lineHeight: 16,
  },
});

export default observer(FilterButtonView);
