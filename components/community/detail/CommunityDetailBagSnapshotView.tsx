import { StyleSheet, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import AcgDisplayText from '@/components/acg/AcgDisplayText';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgRadius, AcgRow, AcgType } from '@/constants/DesignTokens';
import CommunityPost from '@/model/community/CommunityPost';
import { formatCommunityWeight } from '@/model/community/CommunityFormat';
import app from '@/model/app/App';

const CommunityDetailBagSnapshotView = observer(({ post }: { post: CommunityPost }) => {
  const snapshot = post.getBagSnapshot();

  if (!snapshot) {
    return null;
  }

  const date = [snapshot.startDate, snapshot.endDate].filter(Boolean).join(' ~ ');

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
      {snapshot.gears.map((gear, index) => (
        <View key={`${gear.name}-${index}`} style={styles.gearRow}>
          <PretendardText style={styles.gearName} numberOfLines={2}>
            {`${gear.company} ${gear.name}`}
          </PretendardText>
          <AcgDisplayText style={styles.gearWeight}>{`${gear.weight}g`}</AcgDisplayText>
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
  gearRow: {
    minHeight: AcgRow.minHeight,
    paddingVertical: AcgRow.paddingVertical,
    borderTopWidth: 1,
    borderTopColor: Acg.hairline,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gearName: { ...AcgType.rowSubtitle, color: Acg.ink, flex: 1, marginRight: 12 },
  gearWeight: { color: Acg.ink },
});

export default CommunityDetailBagSnapshotView;
