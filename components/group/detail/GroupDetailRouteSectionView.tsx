import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import GroupRouteListView from '@/components/group/route/GroupRouteListView';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import GroupRoute from '@/model/group/GroupRoute';
import GroupValidationError from '@/model/group/GroupValidationError';
import GroupDetail from '@/model/group-detail/GroupDetail';
import { getGroupValidationMessage } from '@/model/group-error/GroupErrorMessage';
import { setPendingGroupRoute } from '@/model/group-map/GroupMapHandoff';
import GroupRouteList from '@/model/group-route/GroupRouteList';
import GroupSectionErrorView from './GroupSectionErrorView';
import GroupSectionHeaderView from './GroupSectionHeaderView';

interface Props {
  detail: GroupDetail;
  // 상단 지도 밴드(GRP-7)와 같은 목록을 쓴다 — 조회·포커스 갱신은 `useGroupDetailState`가 맡는다.
  routeList: GroupRouteList;
}

/**
 * 코스 섹션 (GRP-8).
 *
 * `코스 추가`가 파일 선택 → 파싱 → 업로드까지 한 흐름으로 끝낸다(모델이 맡는다). 행을 누르면
 * 그룹 지도에서 그 코스를 강조한다 — 포인트 섹션이 지도로 넘기는 방식과 같은 핸드오프다.
 * 행 끝에는 `⋯`만 선다(방향 뒤집기·삭제는 메뉴 안, GRP-11). `코스 추가`는 이 자리에서 끝나는
 * 액션이라 셰브론 없는 텍스트 액션이다(섹션 머리 문법 — `GroupSectionHeaderView`).
 * 상한(5개)에 닿으면 액션을 막고 그 자리에 이유를 적는다. 눌리지 않는 버튼만 두면 사용자가
 * 왜 안 되는지 알 수 없다(HIG).
 */
const GroupDetailRouteSectionView: FC<Props> = ({ detail, routeList }) => {
  const router = useRouter();
  const l10n = app.getL10n();
  const groupId = detail.getGroupId();
  const group = detail.getGroup();

  const handleAdd = () => {
    void routeList.addRoute();
  };

  const handleSelect = (route: GroupRoute) => {
    setPendingGroupRoute(route.getId());
    router.push({ pathname: '/group/[id]/map', params: { id: groupId } });
  };

  const handleDelete = (route: GroupRoute) => {
    app.getAlertManager()?.show({
      // 지우는 대상과 함께 사라지는 것(Storage 원본)을 문구에 담는다 — 되돌릴 수 없다.
      message: l10n.t('route.deleteConfirm', { name: route.getName() }),
      confirmText: l10n.t('route.delete'),
      cancelText: l10n.t('common.cancel'),
      destructive: true,
      onConfirm: async () => {
        await routeList.deleteRoute(route);
      },
    });
  };

  if (!group) {
    return null;
  }

  const isFull = routeList.isFull();
  const isSubmitting = routeList.isSubmitting();
  const canAdd = routeList.canAdd();

  const renderBody = () => {
    // 못 읽은 것과 없는 것을 구분한다 — 실패에 빈 상태를 보이면 재시도할 길이 사라진다.
    if (routeList.getError() && routeList.getCount() === 0) {
      return (
        <GroupSectionErrorView
          message={l10n.t('group.detail.routesLoadFailed')}
          onRetry={() => void routeList.refresh()}
        />
      );
    }

    if (routeList.getCount() === 0) {
      return (
        <PretendardText style={styles.empty}>
          {l10n.t('group.detail.routesEmpty')}
        </PretendardText>
      );
    }

    return (
      <GroupRouteListView
        routes={routeList.getRoutes()}
        memberIds={group.getMemberIds()}
        onSelect={handleSelect}
        onDelete={handleDelete}
        canDelete={route => routeList.canDelete(route, group)}
        disabled={isSubmitting}
      />
    );
  };

  return (
    <View style={styles.section}>
      <GroupSectionHeaderView
        title={l10n.t('group.detail.routesTitle')}
        {...(canAdd
          ? {
              actionLabel: isSubmitting
                ? l10n.t('group.route.uploading')
                : l10n.t('group.route.add'),
              onPressAction: handleAdd,
              actionDisabled: isFull || isSubmitting,
              actionBusy: isSubmitting,
            }
          : {})}
      />
      {isFull ? (
        <PretendardText style={styles.notice}>
          {getGroupValidationMessage(GroupValidationError.RouteLimitExceeded)}
        </PretendardText>
      ) : null}
      {renderBody()}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginTop: AcgLayout.section,
  },
  notice: {
    ...AcgType.meta,
    color: Acg.textMuted,
    paddingBottom: 8,
  },
  empty: {
    ...AcgType.body,
    color: Acg.textMuted,
    paddingVertical: 12,
  },
});

export default observer(GroupDetailRouteSectionView);
