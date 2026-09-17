import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AcgDisplayText from '@/components/acg/AcgDisplayText';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgRadius, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import { GroupBagSnapshot } from '@/model/group/GroupData';
import {
  formatGroupDateRange,
  formatGroupWeight,
  getGroupSyncedAtText,
} from '@/model/group-format/GroupFormat';

interface Props {
  snapshot: GroupBagSnapshot;
  nickname: string;
  isMine: boolean;
}

/**
 * 멤버 배낭 요약 카드 (GRP-5). 커뮤니티 패킹 스냅샷 카드와 같은 문법 —
 * 순백 지면 위 연회색 면 + 모서리 12, 그림자 없음.
 *
 * 스냅샷에 담기는 것만 표시한다. 메모·좌표·이동 경로·건강 기록·개인 장비 사진은
 * 데이터에 애초에 없다(DM-29 제외 목록).
 */
const GroupMemberBagSummaryView: FC<Props> = ({
  snapshot,
  nickname,
  isMine,
}) => {
  const l10n = app.getL10n();
  const dateText = formatGroupDateRange(
    snapshot.startDate ?? '',
    snapshot.endDate ?? ''
  );
  const label = isMine
    ? l10n.t('group.member.mine')
    : l10n.t('group.member.bagOf', { name: nickname });

  return (
    <View style={styles.card}>
      <PretendardText style={styles.label}>{label}</PretendardText>
      <PretendardText weight='semibold' style={styles.name} numberOfLines={2}>
        {snapshot.name}
      </PretendardText>
      {dateText ? (
        <PretendardText style={styles.meta} numberOfLines={1}>
          {dateText}
        </PretendardText>
      ) : null}
      {snapshot.destinationName ? (
        <View style={styles.destinationRow}>
          <Ionicons name='location-outline' size={14} color={Acg.textMuted} />
          <PretendardText style={styles.meta} numberOfLines={1}>
            {snapshot.destinationName}
          </PretendardText>
        </View>
      ) : null}
      <View style={styles.stats}>
        <View style={styles.weightBlock}>
          <PretendardText style={styles.statLabel}>
            {l10n.t('group.member.totalWeight')}
          </PretendardText>
          <AcgDisplayText style={styles.weight}>
            {`${formatGroupWeight(snapshot.totalWeight)}kg`}
          </AcgDisplayText>
        </View>
        <PretendardText style={styles.gearCount}>
          {l10n.t('group.member.gearCount', { count: snapshot.itemCount })}
        </PretendardText>
      </View>
      <PretendardText style={styles.synced}>
        {l10n.t('group.member.syncedAt', {
          time: getGroupSyncedAtText(snapshot.syncedAt),
        })}
      </PretendardText>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginTop: AcgLayout.communityCardGap,
    padding: AcgLayout.communityCardPadding,
    backgroundColor: Acg.controlFill,
    borderRadius: AcgRadius.thumb,
  },
  label: { ...AcgType.meta, color: Acg.textMuted },
  name: { ...AcgType.sectionTitle, color: Acg.ink, marginTop: 4 },
  meta: { ...AcgType.rowSubtitle, color: Acg.textMuted },
  destinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AcgLayout.chipGap,
  },
  stats: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 12 },
  weightBlock: { gap: 2 },
  statLabel: { ...AcgType.meta, color: Acg.textMuted },
  weight: { ...AcgType.displayMedium, color: Acg.ink },
  gearCount: {
    ...AcgType.rowSubtitle,
    color: Acg.textMuted,
    marginLeft: 12,
    marginBottom: 2,
  },
  synced: { ...AcgType.meta, color: Acg.textMuted, marginTop: 12 },
});

export default observer(GroupMemberBagSummaryView);
