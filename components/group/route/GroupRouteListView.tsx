import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgRow, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import GroupRoute from '@/model/group/GroupRoute';
import { getGroupPointAuthorLabel } from '@/model/group-point/GroupPointLabels';

interface Props {
  routes: GroupRoute[];
  // 작성자 표시 파생에 쓰는 현재 멤버 목록(GRP-4).
  memberIds: readonly string[];
  // 행 탭 — 그룹 지도에서 해당 코스를 강조한다(GRP-8). 없으면 행이 눌리지 않는다.
  onSelect?: ((route: GroupRoute) => void) | undefined;
  // 삭제는 올린 사람과 방장에게만 노출한다. 판정은 화면이 내려준다.
  onDelete?: ((route: GroupRoute) => void) | undefined;
  canDelete?: ((route: GroupRoute) => boolean) | undefined;
  disabled?: boolean | undefined;
}

/**
 * 코스 목록 (GRP-8).
 *
 * 행은 포인트 목록과 같은 문법이다 — 이름 16 medium + 메타 14 잉크 한 줄이고, 거리·고도 상승은
 * 배지가 아니라 메타 줄의 조각으로 둔다(HM-8). 숫자를 맨 앞에 둬 코스끼리 거리를 훑을 수 있게 한다.
 */
const GroupRouteListView: FC<Props> = ({
  routes,
  memberIds,
  onSelect,
  onDelete,
  canDelete,
  disabled,
}) => {
  const l10n = app.getL10n();
  const separator = l10n.t('group.detail.metaSeparator');

  const renderRow = (route: GroupRoute, index: number) => {
    const elevationGain = route.getElevationGain();
    const meta = [
      route.getDistanceText(),
      ...(elevationGain === undefined
        ? []
        : [
            l10n.t('group.route.elevation', {
              value: Math.round(elevationGain),
            }),
          ]),
      getGroupPointAuthorLabel(
        route.getAuthorId(),
        route.getAuthorName(),
        memberIds
      ),
    ].join(separator);
    const deletable = !!onDelete && (canDelete?.(route) ?? true);
    const body = (
      <View style={styles.rowBody}>
        <PretendardText weight='medium' style={styles.title} numberOfLines={2}>
          {route.getName()}
        </PretendardText>
        <PretendardText style={styles.meta} numberOfLines={1}>
          {meta}
        </PretendardText>
      </View>
    );

    return (
      <View
        key={route.getId()}
        style={[styles.row, index > 0 && styles.rowDivided]}
      >
        {onSelect ? (
          <TouchableOpacity
            style={styles.rowTouchable}
            onPress={() => onSelect(route)}
            activeOpacity={0.7}
            accessibilityRole='button'
            accessibilityLabel={`${route.getName()}${separator}${meta}`}
          >
            {body}
            <Ionicons
              name='chevron-forward'
              size={16}
              color={Acg.textSecondary}
            />
          </TouchableOpacity>
        ) : (
          body
        )}
        {deletable ? (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.action}
              onPress={() => onDelete?.(route)}
              disabled={disabled}
              accessibilityRole='button'
              accessibilityLabel={l10n.t('group.route.delete')}
            >
              <PretendardText style={styles.actionLabel}>
                {l10n.t('group.route.delete')}
              </PretendardText>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  };

  return <View>{routes.map(renderRow)}</View>;
};

const styles = StyleSheet.create({
  row: {
    minHeight: AcgRow.minHeight,
    paddingVertical: AcgRow.paddingVertical,
    justifyContent: 'center',
    gap: 2,
  },
  rowDivided: {
    borderTopWidth: 1,
    borderTopColor: Acg.hairline,
  },
  rowTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AcgLayout.chipGap,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...AcgType.rowTitle,
    color: Acg.ink,
  },
  meta: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
  actions: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: AcgLayout.chipGap,
  },
  action: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  actionLabel: {
    ...AcgType.control,
    color: Acg.ink,
  },
});

export default observer(GroupRouteListView);
