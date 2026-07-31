import { FC, useCallback, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import Warehouse from '@/model/warehouse/Warehouse';
import WarehouseFilter from '@/model/warehouse/WarehouseFilter';
import { observer } from 'mobx-react-lite';
import OrderButtonView from '@/components/order/OrderButtonView';
import OrderOption from '@/model/order/OrderOption';
import PretendardText from '@/components/PretendardText';
import CategoryChipView from '@/components/browse/CategoryChipView';
import { getFineCategoryLabel } from '@/model/gear/GearCategoryGroups';
import { Color } from '@/constants/DesignTokens';
import app from '@/model/app/App';

interface Props {
  warehouse: Warehouse;
}

// 선택 칩을 스크롤 안으로 들일 때 가장자리에 남기는 여백 — 딱 붙으면 잘린 것처럼 보인다.
const CHIP_EDGE_PADDING = 16;

const WarehouseFiltersView: FC<Props> = ({ warehouse }) => {
  const order = warehouse.getOrder();
  const totalCount = warehouse.getGears().length;
  const fineCategoryOptions = warehouse.getFineCategoryOptions();
  const fineCategory = warehouse.getFineCategory();
  const isUnusedOnly = warehouse.isUnusedOnly();
  const hasNeverUsedGear = warehouse.hasNeverUsedGear();
  const selectedFilterName = warehouse.getSelectedFilter().getName();

  /**
   * 1차 칩 행의 가로 스크롤을 선택 칩에 맞춘다.
   *
   * 홈 미리보기에서 카테고리를 좁힌 채 들어오면(HM-4) 선택된 칩이 **스크롤 밖에 있어
   * 보이지 않는다** — 필터가 걸린 줄 모른 채 목록이 적게 나온 것처럼 읽힌다.
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
      ?.logClick('warehouse_filter', { category: filter.getName() });
    warehouse.toggleFilter(filter);
  };

  // 세분 칩 탭 — 전체 칩은 null, 재탭 토글은 Warehouse가 처리한다
  const handleClickFineCategory = (key: string | null) => {
    app
      .getAnalyticsManager()
      ?.logClick('warehouse_fine_filter', { category: key ?? 'all' });
    warehouse.selectFineCategory(key);
  };

  const handleToggleUnusedOnly = () => {
    app.getAnalyticsManager()?.logClick('warehouse_unused_filter', {
      enabled: String(!isUnusedOnly),
    });
    warehouse.toggleUnusedOnly();
  };

  const handleSelectOrder = (option: OrderOption) => {
    app
      .getAnalyticsManager()
      ?.logClick('warehouse_sort', { order: option.getName() });
  };

  return (
    <View style={styles.container}>
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
            key={filter.getName()}
            onLayout={handleChipLayout(filter.getName())}
          >
            <CategoryChipView
              label={filter.getName()}
              selected={filter.isSelected()}
              onPress={() => handleClick(filter)}
            />
          </View>
        ))}
      </ScrollView>
      {fineCategoryOptions.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.scrollView}
          contentContainerStyle={styles.fineScrollContent}
        >
          <CategoryChipView
            label='전체'
            variant='secondary'
            selected={fineCategory === null}
            onPress={() => handleClickFineCategory(null)}
          />
          {fineCategoryOptions.map(key => (
            <CategoryChipView
              key={key}
              label={getFineCategoryLabel(key)}
              variant='secondary'
              selected={fineCategory === key}
              onPress={() => handleClickFineCategory(key)}
            />
          ))}
        </ScrollView>
      )}
      {/* 정리용 토글(WH-2). 창고에서 직접 켜고 끌 수 있어야 한다 — 홈에서 켠 채로 들어왔을
          때만 보이면 끄기만 되고 켤 수가 없다. 해당 장비가 없으면 그리지 않는다. */}
      {hasNeverUsedGear && (
        <View style={styles.unusedRow}>
          <CategoryChipView
            label='한 번도 안 쓴 장비'
            variant='secondary'
            selected={isUnusedOnly}
            onPress={handleToggleUnusedOnly}
            accessibilityLabel={
              isUnusedOnly
                ? '한 번도 안 쓴 장비만 보기 해제'
                : '한 번도 안 쓴 장비만 보기'
            }
          />
        </View>
      )}
      <View style={styles.orderContainer}>
        <PretendardText weight='semibold' style={styles.titleText}>
          총 {totalCount}개
        </PretendardText>
        <OrderButtonView order={order} onSelectOption={handleSelectOrder} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    gap: 4,
    backgroundColor: Color.background,
  },
  scrollView: {
    width: '100%',
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 0,
  },
  // 세분 칩 행 — 1차 행과 구분되게 보조적으로(간격 축소) 배치
  fineScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 0,
  },
  unusedRow: {
    flexDirection: 'row',
  },
  orderContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 16,
    color: Color.textPrimary,
  },
});

export default observer(WarehouseFiltersView);
