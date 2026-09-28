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
import GroupDetailContentCountView from './GroupDetailContentCountView';
import GroupDetailEmptyBandView from './GroupDetailEmptyBandView';
import GroupDetailMapBandView from './GroupDetailMapBandView';
import GroupDetailStatsView from './GroupDetailStatsView';

const ACTIVE_SPOT_STATUS = 'active';
// 지도가 없는 웹(APP-5)에는 밴드를 그리지 않는다(GRP-7). 개수 줄이 그룹 지도(목록)로 가는 입구다.
const IS_WEB = Platform.OS === 'web';

interface Props {
  detail: GroupDetail;
  // 상단 지도 밴드·개수 줄이 그리는 목록. 조회·포커스 갱신은 `useGroupDetailState`가 맡는다.
  routeList: GroupRouteList;
  pointList: GroupPointList;
}

/**
 * 그룹 상세 헤더 (GRP-4 · GRP-7 · GRP-11).
 *
 * 지도 밴드 → 개수 줄 → 이름 → 기간 + D-day → 여행지 → 멤버·배낭 수 순이다(GRP-11 시각 위계).
 *
 * **상단 지도 밴드**(GRP-7) 우선순위: 코스·포인트가 있으면 코스 선 + 포인트 지도
 * (`GroupDetailMapBandView`) → 없고 등록 박지면 박지 정적 밴드(커뮤니티 패킹 스냅샷과 같은
 * Static Map 단일 소스) → 둘 다 없으면 **빈 밴드**(`GroupDetailEmptyBandView` — 코스·포인트를
 * 처음 추가할 입구). 자유 위치는 좌표를 저장하지 않으므로 이름만 적는다(GRP-2 공개 원칙).
 * 코스·포인트를 다 읽기 전에는 어느 밴드도, 개수 줄도 고르지 않는다 — 빈 밴드나 박지 밴드를
 * 먼저 그렸다가 코스 지도로 갈아 끼우면 같은 자리가 한 번 깜빡인다.
 *
 * **개수 줄**(`코스 N · 포인트 N ›`)은 빈 밴드가 서는 빈 그룹에서는 그리지 않는다(빈 밴드가 같은
 * 말을 한다). 웹은 밴드가 없어 개수 줄이 유일한 입구라 빈 그룹이어도 그린다.
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

  const isContentLoaded = routeList.isInitialized() && pointList.isInitialized();
  const routes = routeList.getRoutes();
  const points = pointList.getPoints();
  const hasContent = !!getGroupContentBounds(routes, points);
  const activeSpot = campSpot?.status === ACTIVE_SPOT_STATUS ? campSpot : null;
  // 빈 밴드가 서는 자리(네이티브 · 코스·포인트·등록 박지가 모두 없음).
  const showsEmptyBand = !IS_WEB && isContentLoaded && !hasContent && !activeSpot;

  const renderBand = () => {
    if (IS_WEB || !isContentLoaded) {
      return null;
    }

    if (hasContent) {
      return (
        <GroupDetailMapBandView
          routes={routes}
          points={points}
          campSpot={activeSpot}
          onPress={openMap}
        />
      );
    }

    if (activeSpot) {
      return (
        <SnapshotMapBandView
          latitude={activeSpot.location.latitude}
          longitude={activeSpot.location.longitude}
          variant={SnapshotMapBandVariant.Standalone}
        />
      );
    }

    return <GroupDetailEmptyBandView onPress={openMap} />;
  };

  /**
   * 개수 줄. 박지 밴드만 있는 그룹(코스·포인트 0)에도 그린다 — 박지 밴드는 누를 수 없는 정적
   * 이미지라(URL을 못 만들면 아예 없다) 이 줄이 없으면 그룹 지도로 갈 길이 사라진다.
   */
  const renderCount = () => {
    if (!isContentLoaded || showsEmptyBand) {
      return null;
    }

    return (
      <GroupDetailContentCountView
        routeCount={routeList.getCount()}
        pointCount={pointList.getCount()}
        // 박지 밴드는 이미지를 못 그리면 자리째 없어지므로, 늘 그려지는 코스 지도 밴드에만 붙인다.
        attachedToBand={!IS_WEB && hasContent}
        onPress={openMap}
      />
    );
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
      {renderCount()}
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
