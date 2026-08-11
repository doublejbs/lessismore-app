import { FC } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import Order from '@/model/order/Order';
import OrderOption from '@/model/order/OrderOption';
import { setSortSheetContext } from '@/model/sort/SortSheetHandoff';
import {
  LedgerColor,
  LedgerLayout,
  LedgerSpace,
  LedgerType,
} from '@/constants/LedgerTokens';

interface Props {
  order: Order;
  onSelectOption?: (option: OrderOption) => void;
}

// 셰브론은 글자보다 작다 — 값을 여는 표식이라 라벨과 무게를 다투지 않는다.
const CHEVRON_SIZE = 12;

const PRESS_OPACITY = 0.7;

/**
 * WH-3 창고 정렬 진입 (Ledger).
 *
 * 공용 `OrderButtonView`(칩 면 + 알약)를 쓰지 않고 이 화면 안에서 **글자 + 셰브론**으로
 * 그린다 — 원장의 컨트롤 줄에는 면이 없고, 공용 버튼은 아직 Liquid를 쓰는 배낭 목록·편집이
 * 그대로 쓰고 있어 건드리지 않는다. 시트 진입(모듈 핸드오프 + `/sort-sheet`)은 같은 경로다.
 */
const WarehouseSortView: FC<Props> = ({ order, onSelectOption }) => {
  const router = useRouter();
  const selectedOrderName = order.getSelectedOrderName();

  const handlePressSort = () => {
    const options = order.mapOrderOptions(option => option);

    setSortSheetContext({
      options: options.map(option => ({
        key: option.getOrder(),
        label: option.getName(),
      })),
      selectedKey: order.getSelectedOrderType() ?? '',
      onSelect: key => {
        const option = options.find(item => item.getOrder() === key);

        if (option) {
          onSelectOption?.(option);
          order.setOrderOption(option);
        }
      },
    });
    router.push('/sort-sheet');
  };

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handlePressSort}
      activeOpacity={PRESS_OPACITY}
      accessibilityRole='button'
      accessibilityLabel={`정렬: ${selectedOrderName}`}
    >
      <PretendardText weight='semibold' style={styles.label}>
        {selectedOrderName}
      </PretendardText>
      <Ionicons
        name='chevron-down'
        size={CHEVRON_SIZE}
        color={LedgerColor.inkTertiary}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // 탭 항목과 같은 44 높이라 컨트롤 줄 안에서 글자 중심이 맞는다.
  button: {
    minHeight: LedgerLayout.rowMin,
    flexDirection: 'row',
    alignItems: 'center',
    gap: LedgerSpace.xs,
  },
  label: {
    fontSize: LedgerType.label.fontSize,
    lineHeight: LedgerType.label.lineHeight,
    color: LedgerColor.ink,
  },
});

export default observer(WarehouseSortView);
