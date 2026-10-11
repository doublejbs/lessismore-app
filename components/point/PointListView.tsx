import { FC, useCallback, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { RouteRowAction } from '@/components/route/RouteListView';
import BottomMenuModalView from '@/components/ui/BottomMenuModalView';
import { Acg, AcgLayout, AcgRow, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import MapPoint from '@/model/point/MapPoint';
import { getPointTypeColor, getPointTypeIcon } from '@/model/point/PointLabels';

export interface PointRow {
  id: string;
  point: MapPoint;
  // 메타 한 줄 — 화면이 조립한다(배낭: `유형 · 10.09`, BD-14).
  meta: string;
  // 행 탭(지도 이동 + 카드). 없으면 행이 눌리지 않는다(웹 읽기 전용).
  onSelect?: (() => void) | undefined;
  // 행 `⋯` 메뉴 항목(수정·삭제). 없으면 `⋯`를 그리지 않는다(연결 그룹 포인트·웹).
  actions?: readonly RouteRowAction[] | undefined;
}

interface Props {
  rows: readonly PointRow[];
  disabled?: boolean | undefined;
}

const ICON_CIRCLE = 28;

/**
 * 지도 포인트 목록 행 (BD-14).
 *
 * 행 = **유형 아이콘** + 제목 16 medium + 메타 14 잉크 한 줄(HM-8). 유형 아이콘의 원 색은 지도
 * 마커와 같은 값이라 범례를 겸한다. 행의 액션은 코스 목록(`RouteListView`)과 같은
 * **`⋯` → 메뉴 시트 → (파괴적이면) 확인 알럿** 문법이고, `⋯`가 서는 행에는 셰브론을 두지 않는다 —
 * 행 오른쪽 끝의 누를 곳은 하나다(GRP-11).
 *
 * 모델을 모른다 — 내 배낭 포인트와 연결 그룹의 읽기 전용 포인트가 한 목록에 섞인다.
 */
const PointListView: FC<Props> = ({ rows, disabled }) => {
  const l10n = app.getL10n();
  const separator = l10n.t('common.metaSeparator');
  // `⋯`로 연 메뉴의 대상. 닫을 때 비우지 않는다 — 시트가 내려가는 동안 항목이 사라져 깜빡인다.
  const [menuRow, setMenuRow] = useState<PointRow | null>(null);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
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

  const renderRow = (row: PointRow, index: number) => {
    const type = row.point.getType();
    const title = row.point.getTitle();
    const hasRowActions = !!row.actions && row.actions.length > 0;
    const content = (
      <>
        <View
          style={[styles.icon, { backgroundColor: getPointTypeColor(type) }]}
        >
          <Ionicons name={getPointTypeIcon(type)} size={15} color={Acg.paper} />
        </View>
        <View style={styles.rowBody}>
          <PretendardText
            weight='medium'
            style={styles.title}
            numberOfLines={2}
          >
            {title}
          </PretendardText>
          <PretendardText style={styles.meta} numberOfLines={1}>
            {row.meta}
          </PretendardText>
        </View>
      </>
    );

    return (
      <View key={row.id} style={[styles.row, index > 0 && styles.rowDivided]}>
        {row.onSelect ? (
          <TouchableOpacity
            style={styles.rowTouchable}
            onPress={row.onSelect}
            activeOpacity={0.7}
            accessibilityRole='button'
            accessibilityLabel={`${title}${separator}${row.meta}`}
          >
            {content}
            {hasRowActions ? null : (
              <Ionicons
                name='chevron-forward'
                size={16}
                color={Acg.textSecondary}
              />
            )}
          </TouchableOpacity>
        ) : (
          <View
            style={styles.rowTouchable}
            accessible
            accessibilityLabel={`${title}${separator}${row.meta}`}
          >
            {content}
          </View>
        )}
        {hasRowActions ? (
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => {
              setMenuRow(row);
              setIsMenuVisible(true);
            }}
            disabled={disabled}
            accessibilityRole='button'
            accessibilityLabel={l10n.t('route.menu', { name: title })}
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
    gap: 12,
  },
  // 지도 마커와 같은 유형 색 원 + 흰 아이콘 — 마커를 줄여 놓은 모양이라 지도와 목록이 이어 읽힌다.
  icon: {
    width: ICON_CIRCLE,
    height: ICON_CIRCLE,
    borderRadius: ICON_CIRCLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  menuButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginLeft: AcgLayout.chipGap,
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

export default PointListView;
