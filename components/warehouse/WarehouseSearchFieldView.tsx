import { FC } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import LedgerField from '@/components/ledger/LedgerField';
import Warehouse from '@/model/warehouse/Warehouse';
import {
  LedgerColor,
  LedgerLayout,
  LedgerSpace,
  LedgerType,
} from '@/constants/LedgerTokens';

interface Props {
  warehouse: Warehouse;
  onClose: () => void;
}

const PRESS_OPACITY = 0.7;

/**
 * Android·Web용 창고 검색 필드 (Ledger, WH-8).
 *
 * iOS는 네이티브 검색 바(`headerSearchBarOptions`)가 이 자리를 맡으므로 쓰지 않는다.
 * 필드는 면 없이 하단 헤어라인만 있는 `LedgerField`이고, 이 파일은 그 옆에 `취소`만 더한다.
 */
const WarehouseSearchFieldView: FC<Props> = ({ warehouse, onClose }) => {
  const query = warehouse.getQuery();

  const handleChangeText = (value: string) => {
    warehouse.setQuery(value);
  };

  return (
    <View style={styles.row}>
      <LedgerField
        value={query}
        onChangeText={handleChangeText}
        placeholder='장비 검색'
        accessibilityLabel='장비 검색'
        clearLabel='검색어 지우기'
        showSearchIcon
        autoFocus
        style={styles.field}
      />

      <TouchableOpacity
        onPress={onClose}
        style={styles.cancelButton}
        activeOpacity={PRESS_OPACITY}
        accessibilityRole='button'
        accessibilityLabel='검색 닫기'
      >
        <PretendardText weight='semibold' style={styles.cancelText}>
          취소
        </PretendardText>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LedgerSpace.md,
  },
  // 행 안에서 `취소`를 뺀 남는 폭을 채운다.
  field: {
    flex: 1,
    minWidth: 0,
  },
  cancelButton: {
    minHeight: LedgerLayout.rowMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: LedgerType.label.fontSize,
    lineHeight: LedgerType.label.lineHeight,
    color: LedgerColor.inkSecondary,
  },
});

export default observer(WarehouseSearchFieldView);
