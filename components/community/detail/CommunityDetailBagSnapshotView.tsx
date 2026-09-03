import { StyleSheet, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import AcgDisplayText from '@/components/acg/AcgDisplayText';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgRadius, AcgRow, AcgType } from '@/constants/DesignTokens';
import CommunityPost from '@/model/community/CommunityPost';
import {
  formatCommunityWeight,
  getCommunityBagSnapshotGroups,
} from '@/model/community/CommunityFormat';
import { getGearFilterName } from '@/model/gear/GearFilterName';
import app from '@/model/app/App';

const CommunityDetailBagSnapshotView = observer(({ post }: { post: CommunityPost }) => {
  const snapshot = post.getBagSnapshot();

  if (!snapshot) {
    return null;
  }

  const date = [snapshot.startDate, snapshot.endDate].filter(Boolean).join(' ~ ');
  const groups = getCommunityBagSnapshotGroups(snapshot.gears);
  const l10n = app.getL10n();

  return (
    <View style={styles.card}>
      <PretendardText weight='semibold' style={styles.name}>
        {snapshot.name}
      </PretendardText>
      {date ? <PretendardText style={styles.meta}>{date}</PretendardText> : null}
      {snapshot.destinationName ? (
        <PretendardText style={styles.meta}>{snapshot.destinationName}</PretendardText>
      ) : null}
      <View style={styles.stats}>
        <AcgDisplayText style={styles.weight}>
          {`${formatCommunityWeight(snapshot.totalWeight)}kg`}
        </AcgDisplayText>
        <PretendardText style={styles.meta}>
          {` · ${app.getL10n().t('community.detail.gearCount', {
            count: snapshot.itemCount,
          })}`}
        </PretendardText>
      </View>
      {groups.map((group, groupIndex) => (
        <View key={group.filter}>
          <View
            style={[styles.sectionHeader, groupIndex > 0 && styles.sectionHeaderSpaced]}
            accessibilityRole='header'
          >
            <PretendardText weight='semibold' style={styles.sectionTitle}>
              {getGearFilterName(group.filter)}
            </PretendardText>
            <View style={styles.sectionMeta}>
              <AcgDisplayText style={styles.sectionMetaNumber}>
                {`${group.gears.length}`}
              </AcgDisplayText>
              <PretendardText weight='semibold' style={styles.sectionMetaText}>
                {l10n.t('community.detail.snapshotSectionGearUnit')}
                {l10n.t('community.detail.snapshotSectionSeparator')}
              </PretendardText>
              <AcgDisplayText style={styles.sectionMetaNumber}>
                {`${group.totalWeight}`}
              </AcgDisplayText>
              <PretendardText weight='semibold' style={styles.sectionMetaText}>
                {l10n.t('community.detail.snapshotSectionWeightUnit')}
              </PretendardText>
            </View>
          </View>
          {group.gears.map((gear, gearIndex) => (
            <View
              key={`${gear.name}-${gearIndex}`}
              style={[styles.gearRow, gearIndex > 0 && styles.gearRowDivided]}
            >
              <PretendardText style={styles.gearName} numberOfLines={2}>
                {`${gear.company} ${gear.name}`}
              </PretendardText>
              <AcgDisplayText style={styles.gearWeight}>{`${gear.weight}g`}</AcgDisplayText>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    marginTop: 24,
    padding: 16,
    backgroundColor: Acg.controlFill,
    borderRadius: AcgRadius.thumb,
  },
  name: { ...AcgType.rowTitle, color: Acg.ink },
  meta: { ...AcgType.meta, color: Acg.textMuted },
  stats: { flexDirection: 'row', alignItems: 'baseline', marginTop: 8 },
  weight: { ...AcgType.displaySmall, color: Acg.ink },
  sectionHeader: {
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sectionHeaderSpaced: { marginTop: 12 },
  sectionTitle: { ...AcgType.meta, color: Acg.ink },
  sectionMeta: { flexDirection: 'row', alignItems: 'baseline' },
  sectionMetaNumber: { ...AcgType.meta, color: Acg.ink },
  sectionMetaText: { ...AcgType.meta, color: Acg.ink },
  gearRow: {
    minHeight: AcgRow.minHeight,
    paddingVertical: AcgRow.paddingVertical,
    borderTopWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gearRowDivided: { borderTopWidth: 1, borderTopColor: Acg.hairline },
  gearName: { ...AcgType.rowSubtitle, color: Acg.ink, flex: 1, marginRight: 12 },
  gearWeight: { color: Acg.ink },
});

export default CommunityDetailBagSnapshotView;
