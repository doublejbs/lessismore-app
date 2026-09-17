import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AcgDisplayText from '@/components/acg/AcgDisplayText';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgRow, AcgType } from '@/constants/DesignTokens';
import { formatBagSnapshotWeightInGrams } from '@/model/bag-snapshot/BagSnapshotFormat';
import { CommunityBagSnapshotGear } from '@/model/community/CommunityData';
import { getCommunityBagSnapshotGroups } from '@/model/community/CommunityFormat';
import { getGearFilterName } from '@/model/gear/GearFilterName';

interface Props {
  gears: CommunityBagSnapshotGear[];
  // 구간 머리의 단위·구분 문구. 화면마다 네임스페이스가 달라 키가 아니라 완성된 문구로 받는다.
  gearUnitText: string;
  weightUnitText: string;
  separatorText: string;
  // 담긴 장비가 없을 때 적을 문구. 넘기지 않으면 아무것도 그리지 않는다.
  emptyText?: string | undefined;
  // 카탈로그 장비 행을 눌렀을 때. 분석 이벤트는 화면마다 달라 호출부가 쏜다.
  onSelectGear: (gearId: string) => void;
}

/**
 * 배낭 스냅샷 장비 목록 (CM-4 · GRP-5). **읽기 전용**이다.
 *
 * 순백 지면 위 카테고리별 구간 + 헤어라인 행. 커뮤니티 패킹 스냅샷과 그룹 일행 배낭이 같은
 * 목록을 그리므로 마크업·치수를 한 곳에 둔다 — 갈라지면 같은 배낭이 화면마다 다르게 읽힌다.
 * 카테고리 묶기도 같은 단일 소스(`getCommunityBagSnapshotGroups`)를 쓴다.
 * 카탈로그 장비(`gearId` 있음)만 장비 상세로 갈 수 있고, 사용자 정의 장비는 정적 행이다.
 */
const BagSnapshotGearListView: FC<Props> = ({
  gears,
  gearUnitText,
  weightUnitText,
  separatorText,
  emptyText,
  onSelectGear,
}) => {
  const groups = getCommunityBagSnapshotGroups(gears);

  if (groups.length === 0) {
    if (!emptyText) {
      return null;
    }

    return <PretendardText style={styles.empty}>{emptyText}</PretendardText>;
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
              {gearUnitText}
              {separatorText}
              <AcgDisplayText style={styles.sectionMetaNumber}>
                {formatBagSnapshotWeightInGrams(group.totalWeight)}
              </AcgDisplayText>
              {weightUnitText}
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
                    {`${formatBagSnapshotWeightInGrams(gear.weight)}g`}
                  </AcgDisplayText>
                  {gear.company ? `${separatorText}${gear.company}` : ''}
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
                onPress={() => onSelectGear(gearId)}
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

export default observer(BagSnapshotGearListView);
