import { FC, useCallback, useState } from 'react';
import { observer } from 'mobx-react-lite';
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import AcgSectionHeaderView from '@/components/acg/AcgSectionHeaderView';
import GroupRouteListView from '@/components/group/route/GroupRouteListView';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import GroupRoute from '@/model/group/GroupRoute';
import GroupValidationError from '@/model/group/GroupValidationError';
import GroupDetail from '@/model/group-detail/GroupDetail';
import { getGroupValidationMessage } from '@/model/group-error/GroupErrorMessage';
import { setPendingGroupRoute } from '@/model/group-map/GroupMapHandoff';
import GroupRouteDispatcher from '@/model/group-route/GroupRouteDispatcher';
import GroupRouteList from '@/model/group-route/GroupRouteList';
import GroupSectionErrorView from './GroupSectionErrorView';

interface Props {
  detail: GroupDetail;
}

/**
 * 코스 섹션 (GRP-8).
 *
 * `코스 추가`가 파일 선택 → 파싱 → 업로드까지 한 흐름으로 끝낸다(모델이 맡는다). 행을 누르면
 * 그룹 지도에서 그 코스를 강조한다 — 포인트 섹션이 지도로 넘기는 방식과 같은 핸드오프다.
 * 상한(5개)에 닿으면 액션을 막고 그 자리에 이유를 적는다. 눌리지 않는 버튼만 두면 사용자가
 * 왜 안 되는지 알 수 없다(HIG).
 */
const GroupDetailRouteSectionView: FC<Props> = ({ detail }) => {
  const router = useRouter();
  const l10n = app.getL10n();
  const groupId = detail.getGroupId();
  const [routeList] = useState(() =>
    GroupRouteList.from(GroupRouteDispatcher.new(), groupId)
  );
  const group = detail.getGroup();

  useFocusEffect(
    useCallback(() => {
      if (!groupId) {
        return;
      }

      if (routeList.isInitialized()) {
        void routeList.refresh(true);

        return;
      }

      void routeList.initialize();
    }, [groupId, routeList])
  );

  const handleAdd = () => {
    void routeList.addRoute();
  };

  const handleSelect = (route: GroupRoute) => {
    setPendingGroupRoute(route.getId());
    router.push({ pathname: '/group/[id]/map', params: { id: groupId } });
  };

  const handleDelete = (route: GroupRoute) => {
    app.getAlertManager()?.show({
      message: l10n.t('group.route.deleteConfirm'),
      confirmText: l10n.t('group.route.delete'),
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
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <AcgSectionHeaderView title={l10n.t('group.detail.routesTitle')} />
        </View>
        {canAdd ? (
          <TouchableOpacity
            style={styles.addAction}
            onPress={handleAdd}
            disabled={isFull || isSubmitting}
            accessibilityRole='button'
            accessibilityState={{ disabled: isFull || isSubmitting }}
            accessibilityLabel={l10n.t('group.route.add')}
          >
            {isSubmitting ? (
              <ActivityIndicator size='small' color={Acg.textMuted} />
            ) : null}
            <PretendardText
              style={[
                styles.addActionLabel,
                (isFull || isSubmitting) && styles.addActionDisabled,
              ]}
            >
              {isSubmitting
                ? l10n.t('group.route.uploading')
                : l10n.t('group.route.add')}
            </PretendardText>
          </TouchableOpacity>
        ) : null}
      </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerTitle: {
    flex: 1,
  },
  addAction: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: AcgLayout.chipGap,
    paddingHorizontal: 6,
    marginTop: -10,
  },
  addActionLabel: {
    ...AcgType.control,
    color: Acg.ink,
  },
  addActionDisabled: {
    color: Acg.textMuted,
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
