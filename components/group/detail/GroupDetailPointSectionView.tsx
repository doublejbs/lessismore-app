import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import GroupPointListView from '@/components/group/point/GroupPointListView';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import GroupPoint from '@/model/group/GroupPoint';
import GroupDetail from '@/model/group-detail/GroupDetail';
import { setPendingGroupPoint } from '@/model/group-map/GroupMapHandoff';
import GroupPointList from '@/model/group-point/GroupPointList';
import GroupSectionErrorView from './GroupSectionErrorView';
import GroupSectionHeaderView from './GroupSectionHeaderView';

interface Props {
  detail: GroupDetail;
  // 상단 지도 밴드(GRP-7)와 같은 목록을 쓴다 — 조회·포커스 갱신은 `useGroupDetailState`가 맡는다.
  pointList: GroupPointList;
}

/**
 * 상세에 보이는 포인트 수 (GRP-11). 포인트는 50개까지이고 지도 밴드에 이미 전부 그려진다 —
 * 목록은 최근 것만 맛보기로 보이고 나머지는 그룹 지도가 맡는다.
 */
const RECENT_POINT_LIMIT = 3;

/**
 * 지도 포인트 섹션 (GRP-9).
 *
 * 목록은 지도 화면과 **같은 모델**(`GroupPointList`)을 쓰고, 행을 누르면 그룹 지도에서 그
 * 포인트로 카메라가 이동한다. 등록·수정·삭제는 지도 화면이 맡는다 — 좌표를 찍는 곳이
 * 지도라 입력 경로를 한곳에 모은다. 섹션 머리의 `지도 ›`가 지도 라우트 진입점이다(GRP-10).
 *
 * 목록은 **최근 3개**까지만이다(GRP-11). 그보다 많으면 머리 액션이 `전체 N개 ›`로 바뀐다 — 가는
 * 곳(그룹 지도)은 같고, 라벨이 "여기 안 보이는 것이 더 있다"를 말한다. 3개 이하면 목록이 전부라
 * `전체`는 거짓 약속이 되므로 `지도 ›`를 유지한다(지도는 포인트를 추가하는 곳이기도 하다).
 */
const GroupDetailPointSectionView: FC<Props> = ({ detail, pointList }) => {
  const router = useRouter();
  const l10n = app.getL10n();
  const groupId = detail.getGroupId();
  const group = detail.getGroup();

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

  const pointCount = pointList.getCount();
  const hasMore = pointCount > RECENT_POINT_LIMIT;

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
        recentLimit={RECENT_POINT_LIMIT}
      />
    );
  };

  return (
    <View style={styles.section}>
      <GroupSectionHeaderView
        title={l10n.t('group.detail.pointsTitle')}
        actionLabel={
          hasMore
            ? l10n.t('group.detail.viewAllPoints', { count: pointCount })
            : l10n.t('group.detail.openMap')
        }
        onPressAction={openMap}
        navigates
      />
      {renderBody()}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginTop: AcgLayout.section,
  },
  empty: {
    ...AcgType.body,
    color: Acg.textMuted,
    paddingVertical: 12,
  },
});

export default observer(GroupDetailPointSectionView);
