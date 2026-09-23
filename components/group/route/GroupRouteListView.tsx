import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import RouteListView, {
  RouteRow,
  RouteRowAction,
} from '@/components/route/RouteListView';
import {
  createRouteDirectionAction,
  getRouteMetaParts,
} from '@/components/route/RouteRowParts';
import app from '@/model/app/App';
import GroupRoute from '@/model/group/GroupRoute';
import { getGroupPointAuthorLabel } from '@/model/group-point/GroupPointLabels';

interface Props {
  routes: GroupRoute[];
  // 작성자 표시 파생에 쓰는 현재 멤버 목록(GRP-4).
  memberIds: readonly string[];
  // 행 탭 — 그룹 지도에서 해당 코스를 강조한다(GRP-8). 없으면 행이 눌리지 않는다.
  onSelect?: ((route: GroupRoute) => void) | undefined;
  /**
   * 지금 지도·그래프에 반영된 코스(GRP-8). 지도 화면처럼 선택이 그 자리에 남는 목록만 넘긴다 —
   * 그룹 상세의 코스 섹션은 행을 누르면 지도로 넘어가므로 선택 상태가 없다.
   */
  selectedRouteId?: string | null | undefined;
  // 삭제는 올린 사람과 방장에게만 노출한다. 판정은 화면이 내려준다.
  onDelete?: ((route: GroupRoute) => void) | undefined;
  canDelete?: ((route: GroupRoute) => boolean) | undefined;
  disabled?: boolean | undefined;
}

/**
 * 그룹 코스 목록 (GRP-8). 행 자체는 배낭 코스(BD-11)와 공용인 `RouteListView`가 그리고,
 * 여기서는 그룹 코스를 행 데이터로 옮기는 일만 한다 — 메타 줄에 **올린 사람**이 붙는 것이
 * 배낭 코스와 다른 유일한 점이다(배낭 코스에는 작성자가 없다, DM-30).
 */
const GroupRouteListView: FC<Props> = ({
  routes,
  memberIds,
  onSelect,
  selectedRouteId,
  onDelete,
  canDelete,
  disabled,
}) => {
  const l10n = app.getL10n();
  const separator = l10n.t('group.detail.metaSeparator');

  const toRow = (route: GroupRoute): RouteRow => {
    const meta = [
      ...getRouteMetaParts(route),
      getGroupPointAuthorLabel(
        route.getAuthorId(),
        route.getAuthorName(),
        memberIds
      ),
    ].join(separator);
    const deletable = !!onDelete && (canDelete?.(route) ?? true);
    // 뒤집기는 보기 설정이라 **모든 행**에 있다 — 남이 올린 코스도 누구나 뒤집어 본다(GRP-8).
    // 삭제는 올린 사람·방장에게만, 파괴적 액션이라 메뉴 맨 아래다.
    const actions: RouteRowAction[] = [
      createRouteDirectionAction(route),
      ...(deletable
        ? [
            {
              icon: 'trash-outline' as const,
              label: l10n.t('route.delete'),
              onPress: () => onDelete?.(route),
            },
          ]
        : []),
    ];

    return {
      id: route.getId(),
      title: route.getName(),
      meta,
      ...(onSelect ? { onSelect: () => onSelect(route) } : {}),
      actions,
    };
  };

  return (
    <RouteListView
      rows={routes.map(toRow)}
      selectedId={selectedRouteId}
      disabled={disabled}
    />
  );
};

export default observer(GroupRouteListView);
