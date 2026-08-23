import { FC, useCallback, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import CategoryChipView from '@/components/browse/CategoryChipView';
import { AcgLayout } from '@/constants/DesignTokens';
import Warehouse from '@/model/warehouse/Warehouse';
import WarehouseFilter from '@/model/warehouse/WarehouseFilter';
import app from '@/model/app/App';

interface Props {
  warehouse: Warehouse;
  // 칩 탭 애널리틱스 이벤트 이름 — 이 행을 쓰는 화면(창고 · 안 쓴 장비)을 구분한다.
  analyticsElement: string;
}

// 선택 칩을 스크롤 안으로 들일 때 가장자리에 남기는 여백 — 딱 붙으면 잘린 것처럼 보인다.
const CHIP_EDGE_PADDING = 16;

/**
 * WH-2 1차 카테고리 칩 행.
 *
 * 창고(`WarehouseFiltersView`)와 안 쓴 장비 화면(WH-2-1 `WarehouseUnusedScreen`)이
 * **같은 컴포넌트**를 쓴다 — 두 화면이 같은 축을 같은 데이터(`Warehouse`의 `FilterManager`)로
 * 고르므로 칩 목록·재탭 규칙·선택 칩 노출 스크롤을 두 벌로 두지 않는다.
 */
const WarehouseCategoryChipsView: FC<Props> = ({
  warehouse,
  analyticsElement,
}) => {
  const selectedFilterName = warehouse.getSelectedFilter().getLabel();

  /**
   * 가로 스크롤을 선택 칩에 맞춘다.
   *
   * 카테고리를 좁힌 채 들어오면(홈 미리보기 HM-4 · 창고에서 승계된 안 쓴 장비 WH-2-1)
   * 선택된 칩이 **스크롤 밖에 있어 보이지 않는다** — 필터가 걸린 줄 모른 채 목록이 적게
   * 나온 것처럼 읽힌다.
   *
   * 측정은 `onLayout`으로 모은다. `measureLayout`은 마운트 직후 타이밍을 타는데, 여기서
   * 필요한 건 레이아웃이 확정된 시점의 좌표뿐이라 콜백으로 받는 편이 확실하다.
   */
  const scrollRef = useRef<ScrollView>(null);
  const chipLayoutsRef = useRef<Record<string, { x: number; width: number }>>(
    {}
  );
  const viewportWidthRef = useRef(0);
  const offsetRef = useRef(0);
  // 첫 정렬은 애니메이션 없이 — 진입하자마자 칩이 흐르면 사용자가 건드린 것처럼 보인다.
  const hasAlignedRef = useRef(false);

  const ensureChipVisible = useCallback((name: string) => {
    const layout = chipLayoutsRef.current[name];
    const viewport = viewportWidthRef.current;

    if (!layout || viewport === 0) {
      return;
    }

    const offset = offsetRef.current;
    const left = layout.x;
    const right = layout.x + layout.width;
    const animated = hasAlignedRef.current;

    // 이미 보이는 칩은 건드리지 않는다 — 탭할 때마다 목록이 흔들리면 거슬린다.
    if (left < offset + CHIP_EDGE_PADDING) {
      scrollRef.current?.scrollTo({
        x: Math.max(0, left - CHIP_EDGE_PADDING),
        animated,
      });
    } else if (right > offset + viewport - CHIP_EDGE_PADDING) {
      scrollRef.current?.scrollTo({
        x: right - viewport + CHIP_EDGE_PADDING,
        animated,
      });
    }

    hasAlignedRef.current = true;
  }, []);

  // 선택이 바뀔 때마다 맞춘다(진입 시 승계된 카테고리 · 사용자가 반쯤 걸친 칩을 탭한 경우 모두).
  useEffect(() => {
    ensureChipVisible(selectedFilterName);
  }, [selectedFilterName, ensureChipVisible]);

  const handleChipLayout = (name: string) => (event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;

    chipLayoutsRef.current[name] = { x, width };

    // 마운트 직후에는 위 effect가 좌표보다 먼저 돌기 때문에 여기서 한 번 더 맞춘다.
    if (name === selectedFilterName) {
      ensureChipVisible(name);
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    offsetRef.current = event.nativeEvent.contentOffset.x;
  };

  const handleScrollViewLayout = (event: LayoutChangeEvent) => {
    viewportWidthRef.current = event.nativeEvent.layout.width;
    ensureChipVisible(selectedFilterName);
  };

  const handleClick = (filter: WarehouseFilter) => {
    app
      .getAnalyticsManager()
      ?.logClick(analyticsElement, { category: filter.getName() });
    warehouse.toggleFilter(filter);
  };

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      onLayout={handleScrollViewLayout}
      onScroll={handleScroll}
      scrollEventThrottle={16}
    >
      {warehouse.mapFilters(filter => (
        <View
          key={filter.getFilter()}
          onLayout={handleChipLayout(filter.getLabel())}
        >
          <CategoryChipView
            label={filter.getLabel()}
            selected={filter.isSelected()}
            onPress={() => handleClick(filter)}
          />
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    width: '100%',
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AcgLayout.chipGap,
    paddingHorizontal: 0,
  },
});

export default observer(WarehouseCategoryChipsView);
