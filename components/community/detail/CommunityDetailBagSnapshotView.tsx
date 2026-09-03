import { StyleSheet, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import AcgDisplayText from '@/components/acg/AcgDisplayText';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgRadius, AcgType } from '@/constants/DesignTokens';
import { CommunityBagSnapshot } from '@/model/community/CommunityData';
import {
  formatCommunitySnapshotDateRange,
  formatCommunityWeight,
} from '@/model/community/CommunityFormat';
import app from '@/model/app/App';

const CommunityDetailBagSnapshotView = observer(
  ({ snapshot }: { snapshot: CommunityBagSnapshot }) => {
    const date = formatCommunitySnapshotDateRange(snapshot.startDate, snapshot.endDate);
    const l10n = app.getL10n();
    const meta = [date, snapshot.destinationName]
      .filter(Boolean)
      .join(l10n.t('community.detail.snapshotSectionSeparator'));

    return (
      <View style={styles.card}>
        <PretendardText style={styles.label}>
          {l10n.t('community.detail.bagSnapshot.label')}
        </PretendardText>
        <PretendardText weight='semibold' style={styles.name} numberOfLines={2}>
          {snapshot.name}
        </PretendardText>
        {meta ? (
          <PretendardText style={styles.meta} numberOfLines={1}>
            {meta}
          </PretendardText>
        ) : null}
        <View style={styles.stats}>
          <View style={styles.weightBlock}>
            <PretendardText style={styles.statLabel}>
              {l10n.t('community.detail.bagSnapshot.totalWeight')}
            </PretendardText>
            <AcgDisplayText style={styles.weight}>
              {`${formatCommunityWeight(snapshot.totalWeight)}kg`}
            </AcgDisplayText>
          </View>
          <PretendardText style={styles.gearCount}>
            {l10n.t('community.detail.gearCount', {
              count: snapshot.itemCount,
            })}
          </PretendardText>
        </View>
      </View>
    );
  }
);

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
  stats: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 12 },
  weightBlock: { gap: 2 },
  statLabel: { ...AcgType.meta, color: Acg.textMuted },
  weight: { ...AcgType.displayMedium, color: Acg.ink },
  gearCount: { ...AcgType.rowSubtitle, color: Acg.textMuted, marginLeft: 12, marginBottom: 2 },
});

export default CommunityDetailBagSnapshotView;
