import { observer } from 'mobx-react-lite';
import { FC, useRef, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import WarehouseFilter from '@/model/warehouse/WarehouseFilter';
import FilterButtonView from './FilterButtonView';
import { LiquidLayout } from '@/constants/DesignTokens';

interface BagWithFilters {
  toggleFilter: (filter: WarehouseFilter) => void;
  toggleFilterWithScroll: (filter: WarehouseFilter) => void;
  mapFiltersWithGears: <R>(callback: (filter: WarehouseFilter) => R) => R[];
  setFilterScrollViewRef: (ref: any) => void;
  setFilterButtonRefs: (refs: Map<string, any>) => void;
}

interface Props {
  bagDetail: BagWithFilters;
  /**
   * 모델(`BagDetail`)의 필터 ref 슬롯을 이 인스턴스가 채울지. 슬롯은 **단일**이라
   * 두 인스턴스가 동시에 등록하면 나중에 마운트된 쪽이 앞을 덮어쓰고, 언마운트돼도
   * 복원되지 않아 칩 자동 스크롤(BD-2)이 죽는다.
   *
   * iOS는 필터 줄이 두 벌 존재한다(스크롤 안 인라인 + 핀 상태 유리 띠 오버레이) —
   * **그때 화면에 실제로 보이는 한 벌만** true를 받는다. 자동 스크롤은 보이는 줄에서
   * 일어나야 뜻이 있기 때문이다.
   */
  registerRefs?: boolean;
}

const BagDetailFiltersView: FC<Props> = ({
  bagDetail,
  registerRefs = true,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const filterButtonRefs = useRef<Map<string, any>>(new Map());

  useEffect(() => {
    if (!registerRefs) {
      return;
    }

    bagDetail.setFilterScrollViewRef(scrollViewRef.current);
    bagDetail.setFilterButtonRefs(filterButtonRefs.current);
  }, [bagDetail, registerRefs]);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
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
    paddingBottom: 12,
    // 지면이 비쳐야 한다 — 흰 면을 깔면 필터 영역만 종이처럼 떠 보인다.
    backgroundColor: 'transparent',
  },
  // 좌우 여백을 콘텐츠에 둔다 — 컨테이너에 주면 스크롤이 끝났을 때 마지막 칩이 화면
  // 가장자리에 붙는다.
  scrollContent: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: LiquidLayout.screenH,
  },
});

export default observer(BagDetailFiltersView);
