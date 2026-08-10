import { FC } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import LiquidSearchField from '@/components/liquid/LiquidSearchField';
import Warehouse from '@/model/warehouse/Warehouse';
import { Liquid, LiquidLayout, LiquidMotion } from '@/constants/DesignTokens';

interface Props {
  warehouse: Warehouse;
  onClose: () => void;
}

/**
 * Android·Web용 창고 검색 필드 (Liquid Depth, WH-8).
 *
 * iOS는 네이티브 검색 바(`headerSearchBarOptions`)가 이 자리를 맡으므로 쓰지 않는다
 * ([LiquidGlassNavigation.md](../../specs/LiquidGlassNavigation.md) LG-3).
 * 필드 자체는 공용 프리미티브(`LiquidSearchField`)가 그린다 — 브랜드 디렉토리·브랜드 필터
 * 시트와 같은 유리 문법이라야 값이 갈리지 않는다. 이 화면은 그 옆에 `취소`만 더한다.
 */
const WarehouseSearchFieldView: FC<Props> = ({ warehouse, onClose }) => {
  const query = warehouse.getQuery();

  const handleChangeText = (value: string) => {
    warehouse.setQuery(value);
  };

  return (
    <View style={styles.row}>
      <LiquidSearchField
        value={query}
        onChangeText={handleChangeText}
        placeholder='장비 검색'
        accessibilityLabel='장비 검색'
        autoFocus
        style={styles.field}
      />

      <TouchableOpacity
        onPress={onClose}
        style={styles.cancelButton}
        activeOpacity={LiquidMotion.pressOpacity}
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
    gap: 8,
  },
  // 행 안에서 `취소`를 뺀 남는 폭을 채운다 — 셸은 기본이 부모 폭이라 여기서 늘린다.
  field: {
    flex: 1,
  },
  cancelButton: {
    minWidth: LiquidLayout.touchMin,
    minHeight: LiquidLayout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 14,
    color: Liquid.inkSecondary,
  },
});

export default observer(WarehouseSearchFieldView);
