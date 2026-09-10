import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AcgDisplayText from '@/components/acg/AcgDisplayText';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgRow, AcgType } from '@/constants/DesignTokens';
import { CommunityBagSnapshot } from '@/model/community/CommunityData';
import {
  formatCommunityWeightInGrams,
  getCommunityBagSnapshotGroups,
} from '@/model/community/CommunityFormat';
import { getGearFilterName } from '@/model/gear/GearFilterName';
import app from '@/model/app/App';

const CommunityDetailBagGearListView = observer(
  ({ snapshot }: { snapshot: CommunityBagSnapshot }) => {
    const router = useRouter();
    const groups = getCommunityBagSnapshotGroups(snapshot.gears);
    const l10n = app.getL10n();

    if (groups.length === 0) {
      return null;
    }

    return (
      <View style={styles.list}>
        {groups.map((group, groupIndex) => (
          <View
            key={group.filter}
            style={groupIndex === 0 ? styles.firstSection : styles.section}
          >
            <View style={styles.sectionHeader} accessibilityRole='header'>
              <PretendardText weight='semibold' style={styles.sectionTitle}>
                {getGearFilterName(group.filter)}
              </PretendardText>
              <PretendardText style={styles.sectionMeta}>
                <AcgDisplayText style={styles.sectionMetaNumber}>
                  {`${group.gears.length}`}
                </AcgDisplayText>
                {l10n.t('community.detail.snapshotSectionGearUnit')}
                {l10n.t('community.detail.snapshotSectionSeparator')}
                <AcgDisplayText style={styles.sectionMetaNumber}>
                  {formatCommunityWeightInGrams(group.totalWeight)}
                </AcgDisplayText>
                {l10n.t('community.detail.snapshotSectionWeightUnit')}
              </PretendardText>
            </View>
            {group.gears.map((gear, gearIndex) => {
              const gearId = gear.gearId;
              const rowStyle = [
                styles.gearRow,
                gearIndex > 0 && styles.gearRowDivided,
              ];
              const content = (
                <View style={styles.gearContent}>
                  <PretendardText
                    weight='medium'
                    style={styles.gearName}
                    numberOfLines={1}
                  >
                    {gear.name}
                  </PretendardText>
                  <PretendardText style={styles.gearMeta} numberOfLines={1}>
                    <AcgDisplayText style={styles.gearMetaNumber}>
                      {`${formatCommunityWeightInGrams(gear.weight)}g`}
                    </AcgDisplayText>
                    {gear.company
                      ? `${l10n.t('community.detail.snapshotSectionSeparator')}${gear.company}`
                      : ''}
                  </PretendardText>
                </View>
              );

              if (!gearId) {
                return (
                  <View
                    key={`${gear.name}-${gearIndex}`}
                    style={rowStyle}
                  >
                    {content}
                  </View>
                );
              }

              return (
                <TouchableOpacity
                  key={`${gear.name}-${gearIndex}`}
                  style={rowStyle}
                  onPress={() => {
                    app.getAnalyticsManager()?.logClick(
                      'click_community_snapshot_gear',
                      { gear_id: gearId }
                    );
                    router.push(`/gear-detail/${gearId}`);
                  }}
                  activeOpacity={0.7}
                  accessibilityRole='button'
                  accessibilityLabel={gear.name}
                >
                  {content}
                  <Ionicons
                    name='chevron-forward'
                    size={16}
                    color={Acg.textSecondary}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  list: { marginTop: AcgLayout.communityCardGap },
  firstSection: { marginTop: AcgLayout.communitySectionFirstGap },
  section: { marginTop: AcgLayout.communitySectionGap },
  sectionHeader: {
    minHeight: AcgLayout.communitySectionHeaderGap + AcgType.meta.lineHeight,
    marginBottom: AcgLayout.communitySectionHeaderGap,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sectionTitle: { ...AcgType.meta, color: Acg.ink },
  sectionMeta: { ...AcgType.meta, color: Acg.textMuted, flexShrink: 0 },
  sectionMetaNumber: { ...AcgType.meta, color: Acg.textMuted },
  gearRow: {
    minHeight: AcgRow.communityMinHeight,
    paddingVertical: AcgRow.communityPaddingVertical,
    flexDirection: 'row',
    alignItems: 'center',
  },
  gearRowDivided: { borderTopWidth: 1, borderTopColor: Acg.hairline },
  gearContent: { flex: 1, justifyContent: 'center' },
  gearName: { ...AcgType.rowTitle, color: Acg.ink },
  gearMeta: { ...AcgType.rowSubtitle, color: Acg.ink },
  gearMetaNumber: { ...AcgType.rowSubtitle, color: Acg.ink },
});

export default CommunityDetailBagGearListView;
