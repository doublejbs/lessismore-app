import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AcgDisplayText from '@/components/acg/AcgDisplayText';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgRow, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import { GroupBagSnapshot } from '@/model/group/GroupData';
import { getCommunityBagSnapshotGroups } from '@/model/community/CommunityFormat';
import { formatGroupWeightInGrams } from '@/model/group-format/GroupFormat';
import { getGearFilterName } from '@/model/gear/GearFilterName';

interface Props {
  snapshot: GroupBagSnapshot;
}

/**
 * 멤버 배낭 장비 목록 (GRP-5). **읽기 전용**이다.
 *
 * 순백 지면 위 카테고리별 섹션 + 헤어라인 행으로, 커뮤니티 패킹 스냅샷 목록과 같은 문법이다.
 * 카테고리 묶기는 커뮤니티와 같은 단일 소스를 쓴다 — 두 화면이 각자 묶으면 분류가 갈라진다.
 * 카탈로그 장비(`gearId` 있음)만 장비 상세로 갈 수 있고, 사용자 정의 장비는 정적 행이다.
 */
const GroupMemberBagGearListView: FC<Props> = ({ snapshot }) => {
  const router = useRouter();
  const l10n = app.getL10n();
  const groups = getCommunityBagSnapshotGroups(snapshot.gears);

  if (groups.length === 0) {
    return (
      <PretendardText style={styles.empty}>
        {l10n.t('group.member.emptyGears')}
      </PretendardText>
    );
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
              {l10n.t('group.member.sectionGearUnit')}
              {l10n.t('group.member.sectionSeparator')}
              <AcgDisplayText style={styles.sectionMetaNumber}>
                {formatGroupWeightInGrams(group.totalWeight)}
              </AcgDisplayText>
              {l10n.t('group.member.sectionWeightUnit')}
            </PretendardText>
          </View>
          {group.gears.map((gear, gearIndex) => {
            const gearId = gear.gearId;
            const rowStyle = [styles.gearRow, gearIndex > 0 && styles.gearRowDivided];
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
                    {`${formatGroupWeightInGrams(gear.weight)}g`}
                  </AcgDisplayText>
                  {gear.company
                    ? `${l10n.t('group.member.sectionSeparator')}${gear.company}`
                    : ''}
                </PretendardText>
              </View>
            );

            if (!gearId) {
              return (
                <View key={`${gear.name}-${gearIndex}`} style={rowStyle}>
                  {content}
                </View>
              );
            }

            return (
              <TouchableOpacity
                key={`${gear.name}-${gearIndex}`}
                style={rowStyle}
                onPress={() => router.push(`/gear-detail/${gearId}`)}
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
};

const styles = StyleSheet.create({
  list: { marginTop: AcgLayout.communityCardGap },
  empty: {
    ...AcgType.body,
    color: Acg.textMuted,
    paddingVertical: 24,
  },
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

export default observer(GroupMemberBagGearListView);
