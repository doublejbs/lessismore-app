import { FC, useCallback, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import AcgSectionHeaderView from '@/components/acg/AcgSectionHeaderView';
import GroupPointListView from '@/components/group/point/GroupPointListView';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import GroupPoint from '@/model/group/GroupPoint';
import GroupDetail from '@/model/group-detail/GroupDetail';
import { setPendingGroupPoint } from '@/model/group-map/GroupMapHandoff';
import GroupPointDispatcher from '@/model/group-point/GroupPointDispatcher';
import GroupPointList from '@/model/group-point/GroupPointList';
import GroupSectionErrorView from './GroupSectionErrorView';

interface Props {
  detail: GroupDetail;
}

/**
 * 지도 포인트 섹션 (GRP-9).
 *
 * 목록은 지도 화면과 **같은 모델**(`GroupPointList`)을 쓰고, 행을 누르면 그룹 지도에서 그
 * 포인트로 카메라가 이동한다. 등록·수정·삭제는 지도 화면이 맡는다 — 좌표를 찍는 곳이
 * 지도라 입력 경로를 한곳에 모은다. 섹션 머리의 `지도`가 지도 라우트 진입점이다(GRP-10).
 */
const GroupDetailPointSectionView: FC<Props> = ({ detail }) => {
  const router = useRouter();
  const l10n = app.getL10n();
  const groupId = detail.getGroupId();
  const [pointList] = useState(() =>
    GroupPointList.from(GroupPointDispatcher.new(), groupId)
  );
  const group = detail.getGroup();

  useFocusEffect(
    useCallback(() => {
      if (!groupId) {
        return;
      }

      if (pointList.isInitialized()) {
        void pointList.refresh(true);

        return;
      }

      void pointList.initialize();
    }, [groupId, pointList])
  );

  // `click_group_map_open`은 지도 화면이 마운트될 때 한 번만 남긴다 — 진입점마다 남기면
  // 같은 열기 한 번이 두 번 집계된다.
  const openMap = () => {
    router.push({ pathname: '/group/[id]/map', params: { id: groupId } });
  };

  const handleSelectPoint = (point: GroupPoint) => {
    setPendingGroupPoint(point.getId());
    openMap();
  };

  if (!group) {
    return null;
  }

  const renderBody = () => {
    // 못 읽은 것과 없는 것을 구분한다 — 실패에 빈 상태를 보이면 재시도할 길이 사라진다.
    if (pointList.getError() && pointList.getCount() === 0) {
      return (
        <GroupSectionErrorView
          message={l10n.t('group.detail.pointsLoadFailed')}
          onRetry={() => void pointList.refresh()}
        />
      );
    }

    if (pointList.getCount() === 0) {
      return (
        <PretendardText style={styles.empty}>
          {l10n.t('group.detail.pointsEmpty')}
        </PretendardText>
      );
    }

    return (
      <GroupPointListView
        pointList={pointList}
        group={group}
        userId={detail.getUserId()}
        onSelect={handleSelectPoint}
      />
    );
  };

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <AcgSectionHeaderView title={l10n.t('group.detail.pointsTitle')} />
        </View>
        <TouchableOpacity
          style={styles.mapAction}
          onPress={openMap}
          accessibilityRole='button'
          accessibilityLabel={l10n.t('group.detail.openMap')}
        >
          <PretendardText style={styles.mapActionLabel}>
            {l10n.t('group.detail.openMap')}
          </PretendardText>
          <Ionicons name='chevron-forward' size={14} color={Acg.ink} />
        </TouchableOpacity>
      </View>
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
  mapAction: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    marginTop: -10,
  },
  mapActionLabel: {
    ...AcgType.control,
    color: Acg.ink,
  },
  empty: {
    ...AcgType.body,
    color: Acg.textMuted,
    paddingVertical: 12,
  },
});

export default observer(GroupDetailPointSectionView);
