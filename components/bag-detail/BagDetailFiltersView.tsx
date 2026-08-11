import { observer } from 'mobx-react-lite';
import { FC, useRef, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { AcgLayout } from '@/constants/DesignTokens';
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
    paddingTop: 10,
    paddingBottom: 14,
    paddingLeft: AcgLayout.screenPadding,
    // 지면이 비쳐야 한다 — 흰 면을 깔면 필터 영역만 따로 떠 보인다.
    backgroundColor: 'transparent',
  },
  scrollView: {
    width: '100%',
  },
  scrollContent: {
    alignItems: 'center',
    // 탐색 탭 칩 행과 같은 간격(FD-3).
    gap: AcgLayout.chipGap,
    // 마지막 칩이 화면 오른쪽 끝에 붙지 않게 한다.
    paddingRight: AcgLayout.screenPadding,
  },
});

export default observer(BagDetailFiltersView);
