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
import LiquidChip from '@/components/liquid/LiquidChip';
import LiquidNoticeChip from '@/components/liquid/LiquidNoticeChip';
import { getFineCategoryLabel } from '@/model/gear/GearCategoryGroups';
import { LiquidLayout } from '@/constants/DesignTokens';
import app from '@/model/app/App';

interface Props {
  warehouse: Warehouse;
}

// 선택 칩을 스크롤 안으로 들일 때 가장자리에 남기는 여백 — 딱 붙으면 잘린 것처럼 보인다.
const CHIP_EDGE_PADDING = 16;

/**
 * WH-2 창고 필터 줄 (Liquid Depth, 목업 §8).
 *
 * 1차 칩 줄(사용 여부 알림 칩 + 카테고리 칩) → (해당 그룹이면) 세분 칩 줄 순이다.
 * 개수·정렬은 이 줄이 아니라 **화면 제목 블록**이 든다(목업 §8) — 목록의 규모와 정렬은
 * 화면 대상(`창고`)에 딸린 정보라 제목 옆이 자리다.
 */
const WarehouseFiltersView: FC<Props> = ({ warehouse }) => {
  const fineCategoryOptions = warehouse.getFineCategoryOptions();
  const fineCategory = warehouse.getFineCategory();
  const selectedFilterName = warehouse.getSelectedFilter().getName();
  const unusedOnly = warehouse.isUnusedOnly();
  const unusedCount = warehouse.getUnusedCount();

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

    // 이미 보이는 칩은 건드리지 않는다 — 탭할 때마다 행이 흔들리면 거슬린다.
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

  const handleToggleUnused = () => {
    warehouse.toggleUnusedOnly();
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.scrollView, styles.primaryRow]}
        contentContainerStyle={styles.scrollContent}
        onLayout={handleScrollViewLayout}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* WH-2-1 사용 여부 필터 — 카테고리와 별개 축이지만 **같은 줄 맨 앞**에 둔다
            (2026-08-11 디자인 리뷰). 칩 줄 아래 혼자 뜬 자리에서는 필터인지 경고 배지인지
            갈리지 않았다. 필터들과 같은 줄에 서면 누르면 목록이 걸러진다는 약속이 자리로
            드러나고, 라임 틴트·낮은 높이(30)가 별개 축임을 계속 말한다.
            개수를 함께 보여줘야 몇 개가 걸러지는지 알고 덜어낼 판단을 할 수 있다.
            선택 칩 스크롤 정렬(위)에는 넣지 않는다 — 줄 맨 앞이라 진입 시점(offset 0)에는 항상
            보이고, 멀리 있는 카테고리를 골라 줄이 흐른 뒤에는 다른 필터들과 같이 밀린다. */}
        {unusedCount > 0 || unusedOnly ? (
          <LiquidNoticeChip
            label={`안 쓴 장비 ${unusedCount}`}
            icon='alert-circle-outline'
            selected={unusedOnly}
            onPress={handleToggleUnused}
            accessibilityLabel={`안 쓴 장비만 보기, ${unusedCount}개`}
          />
        ) : null}
        {warehouse.mapFilters(filter => (
          <View
            key={filter.getName()}
            onLayout={handleChipLayout(filter.getName())}
          >
            <LiquidChip
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
          style={[styles.scrollView, styles.fineRow]}
          contentContainerStyle={styles.fineScrollContent}
        >
          <LiquidChip
            label='전체'
            size='sm'
            selected={fineCategory === null}
            onPress={() => handleClickFineCategory(null)}
          />
          {fineCategoryOptions.map(key => (
            <LiquidChip
              key={key}
              label={getFineCategoryLabel(key)}
              size='sm'
              selected={fineCategory === key}
              onPress={() => handleClickFineCategory(key)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    // 지면이 비쳐야 한다 — 흰 면을 깔면 필터 바만 종이처럼 떠 보인다.
    backgroundColor: 'transparent',
  },
  /**
   * 칩 줄은 화면 좌우로 블리드시킨다 — 스크롤이 가장자리에서 끊기지 않게(목업 §8: margin 0 -20).
   * 폭을 지정하지 않는다 — `width: '100%'`를 주면 음수 마진만큼 오른쪽이 잘려 마지막 칩이
   * 화면 안에서 끝난다. 늘어나는 대로(stretch) 두면 부모 폭 + 40이 된다.
   */
  scrollView: {
    marginHorizontal: -LiquidLayout.screenH,
  },
  primaryRow: {
    marginTop: 16,
  },
  // 세분 줄은 1차 줄에 딸린 보조 줄이라 붙여 둔다.
  fineRow: {
    marginTop: 8,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: LiquidLayout.screenH,
  },
  // 세분 칩 줄 — 1차 줄과 구분되게 보조적으로(간격 축소) 배치
  fineScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: LiquidLayout.screenH,
  },
});

export default observer(WarehouseFiltersView);
