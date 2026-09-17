import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AcgDisplayText from '@/components/acg/AcgDisplayText';
import SnapshotMapBandVariant from '@/components/bag-snapshot/SnapshotMapBandVariant';
import SnapshotMapBandView from '@/components/bag-snapshot/SnapshotMapBandView';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import { formatBagSnapshotWeightInKilograms } from '@/model/bag-snapshot/BagSnapshotFormat';
import GroupDetail from '@/model/group-detail/GroupDetail';
import { formatGroupDateRange } from '@/model/group-format/GroupFormat';

const ACTIVE_SPOT_STATUS = 'active';

interface Props {
  detail: GroupDetail;
}

/**
 * 그룹 상세 헤더 (GRP-4 · GRP-7).
 *
 * 등록 박지가 연결된 그룹만 상단에 지도 밴드를 둔다 — 자유 위치는 좌표를 저장하지 않으므로
 * 이름만 적는다(GRP-2 공개 원칙). 밴드는 커뮤니티 패킹 스냅샷과 같은 Static Map 단일 소스를 쓴다.
 */
const GroupDetailHeaderView: FC<Props> = ({ detail }) => {
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
  const summaryText = [
    l10n.t('group.detail.summaryMembers', { count: detail.getMemberCount() }),
    l10n.t('group.detail.summaryBags', { count: detail.getLinkedBagCount() }),
    l10n.t('group.detail.summaryWeight', {
      weight: formatBagSnapshotWeightInKilograms(detail.getTotalWeight()),
    }),
  ].join(separator);

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
      {campSpot?.status === ACTIVE_SPOT_STATUS ? (
        <SnapshotMapBandView
          latitude={campSpot.location.latitude}
          longitude={campSpot.location.longitude}
          variant={SnapshotMapBandVariant.Standalone}
        />
      ) : null}
      <PretendardText weight='semibold' style={styles.name}>
        {group.getName()}
      </PretendardText>
      {dateText ? (
        <PretendardText style={styles.date}>
          <AcgDisplayText style={styles.dateNumber}>{dateText}</AcgDisplayText>
        </PretendardText>
      ) : null}
      {renderDestination()}
      <PretendardText style={styles.summary}>{summaryText}</PretendardText>
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
  summary: {
    ...AcgType.rowSubtitle,
    color: Acg.textMuted,
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
