import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import dayjs from 'dayjs';
import AcgDisplayText from '@/components/acg/AcgDisplayText';
import SnapshotMapBandVariant from '@/components/bag-snapshot/SnapshotMapBandVariant';
import SnapshotMapBandView from '@/components/bag-snapshot/SnapshotMapBandView';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import { getPhaseLabel } from '@/model/bag/TripPhaseHelper';
import GroupDetail from '@/model/group-detail/GroupDetail';
import { getGroupContentBounds } from '@/model/group-detail/GroupDetailMapBand';
import { formatGroupDateRange } from '@/model/group-format/GroupFormat';
import GroupPointList from '@/model/group-point/GroupPointList';
import GroupRouteList from '@/model/group-route/GroupRouteList';
import GroupDetailMapBandView from './GroupDetailMapBandView';
import GroupDetailStatsView from './GroupDetailStatsView';

const ACTIVE_SPOT_STATUS = 'active';
// 지도가 없는 웹(APP-5)에는 밴드를 그리지 않는다(GRP-7).
const IS_WEB = Platform.OS === 'web';

interface Props {
  detail: GroupDetail;
  // 상단 지도 밴드가 그리는 목록 — 아래 코스·포인트 섹션과 같은 인스턴스다.
  routeList: GroupRouteList;
  pointList: GroupPointList;
}

/**
 * 그룹 상세 헤더 (GRP-4 · GRP-7 · GRP-11).
 *
 * 이름 → 기간 + D-day → 여행지 → 수치 줄(합계 무게) 순이다(GRP-11 시각 위계).
 *
 * **상단 지도 밴드**(GRP-7) 우선순위: 코스·포인트가 있으면 코스 선 + 포인트 지도
 * (`GroupDetailMapBandView`) → 없고 등록 박지면 박지 정적 밴드(커뮤니티 패킹 스냅샷과 같은
 * Static Map 단일 소스) → 둘 다 없으면 없음. 자유 위치는 좌표를 저장하지 않으므로 이름만 적는다
 * (GRP-2 공개 원칙). 코스·포인트를 다 읽기 전에는 어느 밴드도 고르지 않는다 — 박지 밴드를
 * 먼저 그렸다가 코스 지도로 갈아 끼우면 같은 자리가 한 번 깜빡인다.
 */
const GroupDetailHeaderView: FC<Props> = ({ detail, routeList, pointList }) => {
  const router = useRouter();
  const l10n = app.getL10n();
  const group = detail.getGroup();
  const campSpot = detail.getCampSpot();

  if (!group) {
    return null;
  }

  const dateText = formatGroupDateRange(
    group.getStartDate(),
    group.getEndDate()
  );
  const destinationName = campSpot?.name ?? group.getDestinationName() ?? '';
  const meetingNote = group.getMeetingNote();
  const separator = l10n.t('group.detail.metaSeparator');
  // 배낭 상세와 같은 상황 라벨(D-day / 오늘 출발 / 여행 중 / 지난 여행) 단일 소스(BD-1).
  const phaseLabel = dateText
    ? getPhaseLabel(dayjs(group.getStartDate()), dayjs(group.getEndDate()))
    : '';

  const openMap = () => {
    router.push({
      pathname: '/group/[id]/map',
      params: { id: detail.getGroupId() },
    });
  };

  const renderBand = () => {
    if (IS_WEB || !routeList.isInitialized() || !pointList.isInitialized()) {
      return null;
    }

    const routes = routeList.getRoutes();
    const points = pointList.getPoints();

    if (getGroupContentBounds(routes, points)) {
      return (
        <GroupDetailMapBandView
          routes={routes}
          points={points}
          campSpot={campSpot?.status === ACTIVE_SPOT_STATUS ? campSpot : null}
          onPress={openMap}
        />
      );
    }

    if (campSpot?.status === ACTIVE_SPOT_STATUS) {
      return (
        <SnapshotMapBandView
          latitude={campSpot.location.latitude}
          longitude={campSpot.location.longitude}
          variant={SnapshotMapBandVariant.Standalone}
        />
      );
    }

    return null;
  };

  const renderDestination = () => {
    if (!destinationName) {
      return null;
    }

    const body = (
      <>
        <Ionicons name='location-outline' size={16} color={Acg.textMuted} />
        <PretendardText style={styles.destinationName} numberOfLines={1}>
          {destinationName}
        </PretendardText>
      </>
    );

    // 등록 박지면 기존 박지 상세 시트로 보낸다(CS-3). 자유 위치는 갈 곳이 없다.
    if (!campSpot) {
      return <View style={styles.destinationRow}>{body}</View>;
    }

    return (
      <TouchableOpacity
        style={styles.destinationRow}
        onPress={() => router.push(`/camp-site/${campSpot.id}`)}
        activeOpacity={0.7}
        accessibilityRole='button'
        accessibilityLabel={destinationName}
      >
        {body}
        <Ionicons name='chevron-forward' size={16} color={Acg.textSecondary} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {renderBand()}
      <PretendardText weight='semibold' style={styles.name}>
        {group.getName()}
      </PretendardText>
      {dateText ? (
        <PretendardText style={styles.date}>
          <AcgDisplayText style={styles.dateNumber}>{dateText}</AcgDisplayText>
          {/* 상황 라벨은 한글이 섞여(`여행 중`) 수치 글꼴을 쓰지 않는다(AcgDisplayText 규칙). */}
          {`${separator}${phaseLabel}`}
        </PretendardText>
      ) : null}
      {renderDestination()}
      <GroupDetailStatsView detail={detail} />
      {meetingNote ? (
        <View style={styles.meetingNoteRow}>
          <Ionicons name='time-outline' size={16} color={Acg.textMuted} />
          <PretendardText style={styles.meetingNote}>
            {meetingNote}
          </PretendardText>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  name: {
    ...AcgType.screenTitle,
    color: Acg.ink,
  },
  date: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
  dateNumber: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
  destinationRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: AcgLayout.chipGap,
  },
  destinationName: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
    flexShrink: 1,
  },
  meetingNoteRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: AcgLayout.chipGap,
  },
  meetingNote: {
    ...AcgType.body,
    color: Acg.ink,
    flexShrink: 1,
  },
});

export default observer(GroupDetailHeaderView);
