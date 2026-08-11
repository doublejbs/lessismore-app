import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import Warehouse from '@/model/warehouse/Warehouse';
import OrderOption from '@/model/order/OrderOption';
import LedgerTextTabs, {
  LedgerTextTabItem,
} from '@/components/ledger/LedgerTextTabs';
import LedgerTextTabsSize from '@/components/ledger/LedgerTextTabsSize';
import WarehouseSortView from '@/components/warehouse/WarehouseSortView';
import { getFineCategoryLabel } from '@/model/gear/GearCategoryGroups';
import {
  LedgerColor,
  LedgerLayout,
  LedgerLine,
  LedgerSpace,
} from '@/constants/LedgerTokens';
import app from '@/model/app/App';

interface Props {
  warehouse: Warehouse;
  onSelectOrder: (option: OrderOption) => void;
}

/**
 * 카테고리 이름과 겹치지 않는 키. 탭 줄이 두 축(카테고리 단일 선택 + 사용 여부 토글)을 한
 * 배열로 들기 때문에 키 공간을 갈라 둔다.
 */
const UNUSED_TAB_KEY = '__unused__';
const FINE_ALL_TAB_KEY = '__fineAll__';

/**
 * WH-2 창고 컨트롤 줄 (Ledger).
 *
 * 알약 칩 줄을 **텍스트 탭**으로 바꿨다. 좌측은 무엇을 볼지(카테고리 + 사용 여부), 우측은
 * 어떤 순서로 볼지(정렬 WH-3)이고, 그 아래 1px 구역 경계가 컨트롤과 원장을 가른다 —
 * 목록 첫 행 위에 헤어라인을 두지 않는 이유가 이 선이다.
 *
 * 세분(2차) 줄은 1차 선택이 있을 때만 나타나며 같은 프리미티브를 한 급 작은 크기로 쓴다.
 */
const WarehouseFiltersView: FC<Props> = ({ warehouse, onSelectOrder }) => {
  const fineCategoryOptions = warehouse.getFineCategoryOptions();
  const fineCategory = warehouse.getFineCategory();
  const selectedFilterName = warehouse.getSelectedFilter().getName();
  const unusedOnly = warehouse.isUnusedOnly();
  const unusedCount = warehouse.getUnusedCount();
  const filters = warehouse.mapFilters(filter => filter);

  /**
   * WH-2-1 `안 쓴 장비 n`을 **탭 줄의 두 번째 항목으로 흡수**한다(Ledger 이식).
   *
   * Liquid 세대에서는 카테고리 칩 줄 안에 라임 틴트 알림 칩으로 앉아 있어, 누르면 목록이
   * 걸러지는 필터인지 "안 쓴 장비가 4개 있다"는 배지인지 갈리지 않았다. 실제로는 필터이므로
   * 다른 필터와 같은 자리·같은 문법을 쓴다.
   *
   * 다만 카테고리는 단일 선택이고 이것은 **함께 걸리는 토글**이라, 선택 표시를 라임 계열
   * 잉크로 갈라 둔다(`accent`) — 같은 잉크 밑줄이면 카테고리 선택을 대체한 것처럼 읽히는데
   * 실제로는 카테고리 필터가 그대로 남아 있다.
   */
  const primaryItems: LedgerTextTabItem[] = filters.map(filter => ({
    key: filter.getName(),
    label: filter.getName(),
    selected: filter.isSelected(),
  }));

  if (unusedCount > 0 || unusedOnly) {
    primaryItems.splice(1, 0, {
      key: UNUSED_TAB_KEY,
      label: '안 쓴 장비',
      count: unusedCount,
      selected: unusedOnly,
      accent: true,
      accessibilityLabel: `안 쓴 장비만 보기, ${unusedCount}개`,
    });
  }

  const fineItems: LedgerTextTabItem[] = [
    {
      key: FINE_ALL_TAB_KEY,
      label: '전체',
      selected: fineCategory === null,
    },
    ...fineCategoryOptions.map(key => ({
      key,
      label: getFineCategoryLabel(key),
      selected: fineCategory === key,
    })),
  ];

  const handleSelectPrimary = (key: string) => {
    if (key === UNUSED_TAB_KEY) {
      warehouse.toggleUnusedOnly();

      return;
    }

    const filter = filters.find(candidate => candidate.getName() === key);

    if (!filter) {
      return;
    }

    app.getAnalyticsManager()?.logClick('warehouse_filter', { category: key });
    warehouse.toggleFilter(filter);
  };

  const handleSelectFine = (key: string) => {
    const fineKey = key === FINE_ALL_TAB_KEY ? null : key;

    app
      .getAnalyticsManager()
      ?.logClick('warehouse_fine_filter', { category: fineKey ?? 'all' });
    void warehouse.selectFineCategory(fineKey);
  };

  return (
    <View style={styles.container}>
      <View style={styles.primaryRow}>
        <LedgerTextTabs
          items={primaryItems}
          onSelect={handleSelectPrimary}
          alignKey={selectedFilterName}
          style={styles.primaryTabs}
          contentContainerStyle={styles.primaryContent}
        />
        <WarehouseSortView
          order={warehouse.getOrder()}
          onSelectOption={onSelectOrder}
        />
      </View>
      {fineCategoryOptions.length > 0 && (
        <LedgerTextTabs
          items={fineItems}
          onSelect={handleSelectFine}
          size={LedgerTextTabsSize.Sm}
          {...(fineCategory ? { alignKey: fineCategory } : {})}
          style={styles.fineTabs}
          contentContainerStyle={styles.fineContent}
        />
      )}
      {/* 구역 경계 — 행 사이 헤어라인보다 한 단 굵어 "컨트롤과 목록"의 경계임이 두께로 읽힌다.
          선택 탭의 2px 밑줄이 이 선에 앉아 탭이 경계에 붙어 보인다. */}
      <View style={styles.rule} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    marginTop: LedgerSpace.sm,
  },
  /**
   * 높이를 44로 못 박는다 — 안의 가로 `ScrollView`는 세로로 콘텐츠를 감싸는데, 그 계산에
   * 기대면 탭 항목의 터치 타깃(44)이 줄에 반영되지 않을 수 있다. 정렬(44)과 밑단을 맞춘다.
   */
  primaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    minHeight: LedgerLayout.rowMin,
    gap: LedgerSpace.md,
  },
  /**
   * 좌측만 화면 끝까지 블리드시킨다 — 스크롤이 좌측 가장자리에서 끊기지 않게. 우측은
   * 정렬이 서 있어 거터까지 갈 수 없다.
   */
  primaryTabs: {
    flex: 1,
    minWidth: 0,
    marginLeft: -LedgerLayout.pageX,
  },
  primaryContent: {
    paddingLeft: LedgerLayout.pageX,
    paddingRight: LedgerSpace.md,
  },
  // 세분 줄은 우측에 컨트롤이 없어 양쪽 모두 블리드한다.
  fineTabs: {
    marginHorizontal: -LedgerLayout.pageX,
  },
  fineContent: {
    paddingHorizontal: LedgerLayout.pageX,
  },
  rule: {
    height: LedgerLine.thin,
    backgroundColor: LedgerColor.lineStrong,
  },
});

export default observer(WarehouseFiltersView);
