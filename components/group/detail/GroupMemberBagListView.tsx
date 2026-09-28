import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AcgDisplayText from '@/components/acg/AcgDisplayText';
import AcgSectionHeaderView from '@/components/acg/AcgSectionHeaderView';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgRow, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import GroupDetail from '@/model/group-detail/GroupDetail';
import GroupMember from '@/model/group/GroupMember';
import { formatBagSnapshotWeightInKilograms } from '@/model/bag-snapshot/BagSnapshotFormat';

interface Props {
  detail: GroupDetail;
  // 내 행의 `연결` — 아직 배낭을 잇지 않았을 때 바로 서는 단일 액션이다.
  onSelectBag: () => void;
  // 행의 `⋯` — 내 행은 배낭 변경·해제, 방장이 보는 다른 멤버 행은 내보내기(GRP-11).
  onOpenMemberMenu: (member: GroupMember) => void;
}

/**
 * 멤버·배낭 목록 (GRP-4 · GRP-5).
 *
 * 방장을 맨 위에 두고 그다음은 참여 순서다(정렬은 `GroupStore.getMembers`가 보장한다).
 * 행 문법은 HM-8 — 이름 16 medium + 메타 14 잉크 한 줄이고 배지·칩을 행 안에 두지 않는다.
 *
 * 행 오른쪽 끝의 누를 곳은 **하나**다(GRP-11):
 * - 내 행 + 배낭 연결됨 → `⋯`(배낭 변경·해제). 해제는 확인 알럿을 거친다.
 * - 내 행 + 미연결 → `연결` 텍스트 액션. 할 일이 하나뿐인 행에 메뉴를 두면 한 번 더 누르게 된다.
 * - 방장이 보는 다른 멤버 행 → `⋯`(내보내기, GRP-4). 내보내기는 자기 자신에게 걸리지 않으므로
 *   내 행에서 두 메뉴가 겹치는 일은 없다.
 * - 그 밖의 행은 액션이 없다.
 * 행 탭(연결된 배낭 보기)은 `⋯`와 별개로 살아 있다.
 */
const GroupMemberBagListView: FC<Props> = ({
  detail,
  onSelectBag,
  onOpenMemberMenu,
}) => {
  const router = useRouter();
  const l10n = app.getL10n();
  const members = detail.getMembers();
  const userId = detail.getUserId();
  const separator = l10n.t('group.detail.metaSeparator');

  const handleOpenMemberBag = (member: GroupMember) => {
    app.getAnalyticsManager()?.logClick('group_member_bag');
    router.push({
      pathname: '/group/[id]/member/[uid]',
      params: { id: detail.getGroupId(), uid: member.getUid() },
    });
  };

  const renderRow = (member: GroupMember, index: number) => {
    const snapshot = detail.getSnapshot(member.getUid());
    const isMine = member.getUid() === userId;
    const ownerSuffix = member.isOwner()
      ? `${separator}${l10n.t('group.detail.ownerLabel')}`
      : '';
    const meta = snapshot
      ? `${separator}${l10n.t('group.detail.gearCount', {
          count: snapshot.itemCount,
        })}${separator}${snapshot.name}${ownerSuffix}`
      : `${l10n.t('group.detail.bagNotLinked')}${ownerSuffix}`;
    const body = (
      <View style={styles.rowBody}>
        <PretendardText
          weight='medium'
          style={styles.nickname}
          numberOfLines={1}
        >
          {member.getNickname()}
        </PretendardText>
        <PretendardText style={styles.meta} numberOfLines={1}>
          {snapshot ? (
            <AcgDisplayText style={styles.metaNumber}>
              {`${formatBagSnapshotWeightInKilograms(snapshot.totalWeight)}kg`}
            </AcgDisplayText>
          ) : null}
          {meta}
        </PretendardText>
      </View>
    );

    // 방장만, 자기 자신이 아닌 행에만 내보내기를 둔다(GRP-4). 멤버에게는 아예 그리지 않는다.
    const canRemove = detail.isOwner() && !isMine && !member.isOwner();
    // 내 행의 배낭 메뉴(변경·해제)는 연결된 배낭이 있을 때만이다.
    const hasMenu = canRemove || (isMine && !!snapshot);
    const menuLabel = isMine
      ? l10n.t('group.detail.bagMenu')
      : l10n.t('group.member.menu', { nickname: member.getNickname() });

    const renderTrailing = () => {
      if (hasMenu) {
        return (
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => onOpenMemberMenu(member)}
            disabled={detail.isSubmitting()}
            accessibilityRole='button'
            accessibilityLabel={menuLabel}
            accessibilityState={{ disabled: detail.isSubmitting() }}
          >
            <Ionicons
              name='ellipsis-horizontal'
              size={20}
              color={Acg.textSecondary}
            />
          </TouchableOpacity>
        );
      }

      if (isMine) {
        return (
          <TouchableOpacity
            style={styles.action}
            onPress={onSelectBag}
            disabled={detail.isSubmitting()}
            accessibilityRole='button'
            accessibilityLabel={l10n.t('group.detail.linkBag')}
            accessibilityState={{ disabled: detail.isSubmitting() }}
          >
            <PretendardText style={styles.actionLabel}>
              {l10n.t('group.detail.linkBag')}
            </PretendardText>
          </TouchableOpacity>
        );
      }

      return null;
    };

    return (
      <View
        key={member.getUid()}
        style={[styles.row, index > 0 && styles.rowDivided]}
      >
        {snapshot ? (
          <TouchableOpacity
            style={styles.rowTouchable}
            onPress={() => handleOpenMemberBag(member)}
            activeOpacity={0.7}
            accessibilityRole='button'
            accessibilityLabel={`${member.getNickname()}${separator}${snapshot.name}`}
          >
            {body}
            {/* 행 끝의 누를 곳은 하나다 — `⋯`가 서는 행에는 셰브론을 두지 않는다(GRP-11). */}
            {hasMenu ? null : (
              <Ionicons
                name='chevron-forward'
                size={16}
                color={Acg.textSecondary}
              />
            )}
          </TouchableOpacity>
        ) : (
          body
        )}
        {renderTrailing()}
      </View>
    );
  };

  return (
    <View style={styles.section}>
      <AcgSectionHeaderView title={l10n.t('group.detail.membersTitle')} />
      {members.map(renderRow)}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginTop: AcgLayout.section,
  },
  row: {
    minHeight: AcgRow.minHeight,
    paddingVertical: AcgRow.paddingVertical,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowDivided: {
    borderTopWidth: 1,
    borderTopColor: Acg.hairline,
  },
  rowTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: AcgLayout.chipGap,
  },
  menuButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  nickname: {
    ...AcgType.rowTitle,
    color: Acg.ink,
  },
  meta: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
  metaNumber: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
  action: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  actionLabel: {
    ...AcgType.control,
    color: Acg.ink,
  },
});

export default observer(GroupMemberBagListView);
