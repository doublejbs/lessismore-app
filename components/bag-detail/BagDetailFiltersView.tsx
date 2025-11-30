import { observer } from 'mobx-react-lite';
import { FC, useRef, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import WarehouseFilter from '@/model/warehouse/WarehouseFilter';
import FilterButtonView from './FilterButtonView';

interface BagWithFilters {
  toggleFilter: (filter: WarehouseFilter) => void;
  toggleFilterWithScroll: (filter: WarehouseFilter) => void;
  mapFiltersWithGears: <R>(callback: (filter: WarehouseFilter) => R) => R[];
  setFilterScrollViewRef: (ref: any) => void;
  setFilterButtonRefs: (refs: Map<string, any>) => void;
}

interface Props {
  bagDetail: BagWithFilters;
}

const BagDetailFiltersView: FC<Props> = ({ bagDetail }) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const filterButtonRefs = useRef<Map<string, any>>(new Map());

  useEffect(() => {
    bagDetail.setFilterScrollViewRef(scrollViewRef.current);
    bagDetail.setFilterButtonRefs(filterButtonRefs.current);
  }, [bagDetail]);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
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
              onRef={(ref: any) => {
                if (ref) {
                  filterButtonRefs.current.set(filter.getName(), ref);
                }
              }}
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
