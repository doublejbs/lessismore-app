import { FC } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import Warehouse from '@/model/warehouse/Warehouse';
import { observer } from 'mobx-react-lite';
import OrderButtonView from '@/components/order/OrderButtonView';
import OrderOption from '@/model/order/OrderOption';
import PretendardText from '@/components/PretendardText';
import CategoryChipView from '@/components/browse/CategoryChipView';
import WarehouseCategoryChipsView from '@/components/warehouse/WarehouseCategoryChipsView';
import { getFineCategoryLabel } from '@/model/gear/GearCategoryGroups';
import { Acg, AcgLayout, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';

interface Props {
  warehouse: Warehouse;
}

const WarehouseFiltersView: FC<Props> = ({ warehouse }) => {
  const order = warehouse.getOrder();
  const totalCount = warehouse.getGears().length;
  const fineCategoryOptions = warehouse.getFineCategoryOptions();
  const fineCategory = warehouse.getFineCategory();

  // 세분 칩 탭 — 전체 칩은 null, 재탭 토글은 Warehouse가 처리한다
  const handleClickFineCategory = (key: string | null) => {
    app
      .getAnalyticsManager()
      ?.logClick('warehouse_fine_filter', { category: key ?? 'all' });
    warehouse.selectFineCategory(key);
  };

  const handleSelectOrder = (option: OrderOption) => {
    app
      .getAnalyticsManager()
      ?.logClick('warehouse_sort', { order: option.getName() });
  };

  return (
    <View style={styles.container}>
      {/* 1차 칩 행은 안 쓴 장비 화면(WH-2-1)과 공용이다 — 선택 칩 노출 스크롤도 그 안에 있다. */}
      <WarehouseCategoryChipsView
        warehouse={warehouse}
        analyticsElement='warehouse_filter'
      />
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
      {/* WH-2-1 `안 쓴 장비`는 이 행에 없다 — 카테고리와 별개 축이라 같은 칩 문법으로 두면
          카테고리를 하나 더 고르는 것처럼 읽혔다. 하단 우측 플로팅 버튼
          (`WarehouseUnusedButtonView`)으로 나가 전용 화면을 연다(2026-08-13). */}
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
    // 지면이 비쳐야 한다 — 흰 면을 깔면 필터 바만 종이처럼 떠 보인다.
    backgroundColor: 'transparent',
  },
  scrollView: {
    width: '100%',
  },
  // 세분 칩 행 — 1차 행과 구분되게 보조적으로(간격 축소) 배치
  fineScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AcgLayout.chipGap,
    paddingHorizontal: 0,
  },
  orderContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleText: {
    ...AcgType.rowSubtitle,
    color: Acg.textMuted,
  },
});

export default observer(WarehouseFiltersView);
