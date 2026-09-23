import { FC, useCallback, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import BottomMenuModalView from '@/components/ui/BottomMenuModalView';
import { Acg, AcgLayout, AcgRow, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';

export interface RouteRowAction {
  // 메뉴 항목 아이콘. `BottomMenuModalView`가 요구하는 모양 그대로다.
  icon: keyof typeof Ionicons.glyphMap;
  // 메뉴 항목 라벨. 행마다 다른 문구를 주면 VoiceOver가 대상을 구분하지 못한다.
  label: string;
  onPress: () => void;
}

export interface RouteRow {
  id: string;
  title: string;
  // 메타 한 줄. 값을 ` · `로 이어 붙이고 **숫자를 맨 앞**에 둔다(HM-8).
  meta: string;
  // 행 탭. 없으면 행이 눌리지 않는다(읽기 전용 목록).
  onSelect?: (() => void) | undefined;
  actions?: readonly RouteRowAction[] | undefined;
}

interface Props {
  rows: readonly RouteRow[];
  /**
   * 지금 지도·그래프에 반영된 행(GRP-8 · BD-11). 넘기지 않으면 선택 표식을 그리지 않는다 —
   * 그룹 상세의 코스 섹션처럼 행을 누르면 다른 화면으로 넘어가는 목록에는 선택 상태가 없다.
   */
  selectedId?: string | null | undefined;
  disabled?: boolean | undefined;
}

/** 선택 표식(잉크 막대)의 굵기·높이. 배지가 아니라 행 앞에 서는 얇은 인디케이터다. */
const INDICATOR_WIDTH = 3;
const INDICATOR_HEIGHT = 28;
/** 인디케이터가 서는 앞칸. 선택 표식을 쓰는 목록에서만 생기고, 모든 행이 같은 폭을 쓴다. */
const INDICATOR_COLUMN = 11;

/**
 * 코스 목록 행 (GRP-8, BD-11). 그룹 코스 목록과 배낭 코스 목록이 **같은 행**을 쓴다.
 *
 * 행 문법은 HM-8 그대로다 — 이름 16 medium + 메타 14 잉크 한 줄이고, 거리·고도 상승·출처는
 * 배지가 아니라 메타 줄의 조각이다. 면 없이 헤어라인으로만 가르는 목록에서 배지는 유일한
 * 예외 면이 되고, 값 하나 때문에 행마다 작은 사각형이 생긴다.
 *
 * 행의 액션은 **`⋯` → 메뉴 시트 → (파괴적이면) 확인 알럿** 문법이다(멤버 내보내기 GRP-4와
 * 같은 문법). 코스 삭제는 Firestore 문서와 Storage 원본을 함께 지우므로, 맨 텍스트 `삭제`를
 * 행에 늘어놓으면 되돌릴 수 없는 액션이 눌러도 되는 라벨처럼 읽힌다.
 *
 * 이 컴포넌트는 모델을 모른다 — 그룹 코스와 배낭 코스, 그리고 배낭 화면에 섞여 들어오는
 * 연결 그룹의 읽기 전용 코스(BD-11)를 한 목록에 담을 수 있어야 하기 때문이다.
 */
const RouteListView: FC<Props> = ({ rows, selectedId, disabled }) => {
  const l10n = app.getL10n();
  const separator = l10n.t('common.metaSeparator');
  /**
   * `⋯`로 연 메뉴의 대상. 닫을 때 비우지 않는다 — 시트가 슬라이드로 내려가는 동안 항목이
   * 사라져 깜빡인다(그룹 상세 멤버 메뉴와 같은 이유).
   */
  const [menuRow, setMenuRow] = useState<RouteRow | null>(null);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  /**
   * 코스가 하나뿐이면 표식을 그리지 않는다 — 고를 것이 없는 목록에서 선택 표식은
   * 무엇과 구분되는지 말하지 않는 장식이 된다(지도 화면이 코스 칩을 감추는 판정과 같다).
   */
  const showIndicator = !!selectedId && rows.length > 1;
  // 액션이 하나도 없는 목록에는 메뉴 시트를 달지 않는다.
  const hasActions = rows.some(row => !!row.actions?.length);

  const handleCloseMenu = useCallback(() => {
    setIsMenuVisible(false);
  }, []);

  const getMenuItems = () => {
    if (!menuRow?.actions) {
      return [];
    }

    return menuRow.actions.map(action => ({
      icon: action.icon,
      text: action.label,
      onPress: action.onPress,
    }));
  };

  const renderRow = (row: RouteRow, index: number) => {
    const selected = showIndicator && row.id === selectedId;
    const body = (
      <View style={styles.rowBody}>
        <PretendardText weight='medium' style={styles.title} numberOfLines={2}>
          {row.title}
        </PretendardText>
        <PretendardText style={styles.meta} numberOfLines={1}>
          {row.meta}
        </PretendardText>
      </View>
    );
    const lead = showIndicator ? (
      <View style={styles.indicatorColumn}>
        {selected ? <View style={styles.indicator} /> : null}
      </View>
    ) : null;

    return (
      <View key={row.id} style={[styles.row, index > 0 && styles.rowDivided]}>
        {row.onSelect ? (
          <TouchableOpacity
            style={styles.rowTouchable}
            onPress={row.onSelect}
            activeOpacity={0.7}
            accessibilityRole='button'
            accessibilityLabel={`${row.title}${separator}${row.meta}`}
            accessibilityState={{ selected }}
          >
            {lead}
            {body}
            <Ionicons
              name='chevron-forward'
              size={16}
              color={Acg.textSecondary}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.rowTouchable}>
            {lead}
            {body}
          </View>
        )}
        {/* 액션이 없는 행에는 `⋯`를 그리지 않는다. 코스 목록은 방향 뒤집기가 모든 행에 있어
          (보기 설정이라 권한과 무관하다, GRP-8) 남이 올린 코스·연결 그룹 코스에도 `⋯`가 선다. */}
        {row.actions && row.actions.length > 0 ? (
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => {
              setMenuRow(row);
              setIsMenuVisible(true);
            }}
            disabled={disabled}
            accessibilityRole='button'
            accessibilityLabel={l10n.t('route.menu', { name: row.title })}
            accessibilityState={{ disabled: !!disabled }}
          >
            <Ionicons
              name='ellipsis-horizontal'
              size={20}
              color={Acg.textSecondary}
            />
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <View>
      {rows.map(renderRow)}
      {hasActions ? (
        <BottomMenuModalView
          visible={isMenuVisible}
          onClose={handleCloseMenu}
          menuItems={getMenuItems()}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    minHeight: AcgRow.minHeight,
    paddingVertical: AcgRow.paddingVertical,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowDivided: {
    borderTopWidth: 1,
    borderTopColor: Acg.hairline,
  },
  rowTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: AcgLayout.chipGap,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  /**
   * 선택 표식은 행 앞에 서는 잉크 막대다 — 면 채움·배지를 쓰지 않는다(HM-8). 앞칸은 선택
   * 여부와 무관하게 자리를 잡아, 선택이 옮겨 다녀도 이름의 왼쪽 정렬이 흔들리지 않는다.
   */
  indicatorColumn: {
    width: INDICATOR_WIDTH,
    marginRight: INDICATOR_COLUMN - INDICATOR_WIDTH - AcgLayout.chipGap,
    alignItems: 'flex-start',
  },
  indicator: {
    width: INDICATOR_WIDTH,
    height: INDICATOR_HEIGHT,
    borderRadius: INDICATOR_WIDTH / 2,
    backgroundColor: Acg.ink,
  },
  // 멤버 행(GRP-4)과 같은 치수의 `⋯` 버튼 — 44×44pt 히트 영역.
  menuButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  title: {
    ...AcgType.rowTitle,
    color: Acg.ink,
  },
  meta: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
});

export default RouteListView;
