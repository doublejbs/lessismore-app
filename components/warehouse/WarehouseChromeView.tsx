import { FC } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LedgerColor, LedgerLayout } from '@/constants/LedgerTokens';

interface Props {
  onPressBack: () => void;
  onPressSearch: () => void;
  onPressAdd: () => void;
  /** 창고가 완전히 빈 상태에서는 검색을 내린다(WH-8) */
  showSearch: boolean;
}

const BACK_ICON_SIZE = 26;
const ACTION_ICON_SIZE = 22;
const ADD_ICON_SIZE = 26;

const PRESS_OPACITY = 0.7;

/**
 * Android·Web용 창고 크롬 (Ledger). iOS는 네이티브 투명 헤더가 같은 자리를 맡는다.
 *
 * **유리 캡슐이 아니라 아이콘만**이다 — 면·테두리·그림자·블러가 없다. 크롬이 떠 있지
 * 않으므로 그림자를 둘 이유도 없다. 아이콘 상자는 44라 글리프 중심이 22에 놓여, 시스템
 * 내비게이션 바와 같은 좌우 축을 갖는다.
 */
const WarehouseChromeView: FC<Props> = ({
  onPressBack,
  onPressSearch,
  onPressAdd,
  showSearch,
}) => {
  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.iconBox}
        onPress={onPressBack}
        activeOpacity={PRESS_OPACITY}
        accessibilityRole='button'
        accessibilityLabel='뒤로'
      >
        <Ionicons
          name='chevron-back'
          size={BACK_ICON_SIZE}
          color={LedgerColor.ink}
        />
      </TouchableOpacity>
      <View style={styles.spacer} />
      {showSearch ? (
        <TouchableOpacity
          style={styles.iconBox}
          onPress={onPressSearch}
          activeOpacity={PRESS_OPACITY}
          accessibilityRole='button'
          accessibilityLabel='장비 검색'
        >
          <Ionicons
            name='search'
            size={ACTION_ICON_SIZE}
            color={LedgerColor.ink}
          />
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity
        style={styles.iconBox}
        onPress={onPressAdd}
        activeOpacity={PRESS_OPACITY}
        accessibilityRole='button'
        accessibilityLabel='장비 추가'
      >
        <Ionicons name='add' size={ADD_ICON_SIZE} color={LedgerColor.ink} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: LedgerLayout.rowMin,
    height: LedgerLayout.rowMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacer: {
    flex: 1,
  },
});

export default WarehouseChromeView;
