import { observer } from 'mobx-react-lite';
import { FC } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import WarehouseFilter from '@/model/warehouse/WarehouseFilter';
import FilterButtonView from './FilterButtonView';

interface BagWithFilters {
  toggleFilter: (filter: WarehouseFilter) => void;
  toggleFilterWithScroll: (filter: WarehouseFilter) => void;
  mapFiltersWithGears: <R>(callback: (filter: WarehouseFilter) => R) => R[];
}

interface Props {
  bagDetail: BagWithFilters;
}

const BagDetailFiltersView: FC<Props> = ({ bagDetail }) => {
  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        horizontal={true}
        showsHorizontalScrollIndicator={false}
      >
        {bagDetail.mapFiltersWithGears(filter => {
          return (
            <FilterButtonView
              key={filter.getName()}
              filter={filter}
              bagDetail={bagDetail}
            />
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingBottom: 15,
    paddingLeft: 20,
    backgroundColor: 'white',
  },
  scrollView: {
    height: 32,
  },
  scrollContent: {
    gap: 8,
  },
});

export default observer(BagDetailFiltersView);
