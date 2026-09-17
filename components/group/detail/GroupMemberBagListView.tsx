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
import { formatGroupWeight } from '@/model/group-format/GroupFormat';

interface Props {
  detail: GroupDetail;
  onSelectBag: () => void;
  onUnlinkBag: () => void;
}

/**
 * 멤버·배낭 목록 (GRP-4 · GRP-5).
 *
 * 방장을 맨 위에 두고 그다음은 참여 순서다(정렬은 `GroupStore.getMembers`가 보장한다).
 * 행 문법은 HM-8 — 이름 16 medium + 메타 14 잉크 한 줄이고 배지·칩을 행 안에 두지 않는다.
 */
const GroupMemberBagListView: FC<Props> = ({
  detail,
  onSelectBag,
  onUnlinkBag,
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
              {`${formatGroupWeight(snapshot.totalWeight)}kg`}
            </AcgDisplayText>
          ) : null}
          {meta}
        </PretendardText>
      </View>
    );

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
            <Ionicons
              name='chevron-forward'
              size={16}
              color={Acg.textSecondary}
            />
          </TouchableOpacity>
        ) : (
          body
        )}
        {isMine ? (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.action}
              onPress={onSelectBag}
              disabled={detail.isSubmitting()}
              accessibilityRole='button'
              accessibilityLabel={l10n.t(
                snapshot ? 'group.detail.changeBag' : 'group.detail.linkBag'
              )}
            >
              <PretendardText style={styles.actionLabel}>
                {l10n.t(
                  snapshot ? 'group.detail.changeBag' : 'group.detail.linkBag'
                )}
              </PretendardText>
            </TouchableOpacity>
            {snapshot ? (
              <TouchableOpacity
                style={styles.action}
                onPress={onUnlinkBag}
                disabled={detail.isSubmitting()}
                accessibilityRole='button'
                accessibilityLabel={l10n.t('group.detail.unlinkBag')}
              >
                <PretendardText style={styles.actionLabel}>
                  {l10n.t('group.detail.unlinkBag')}
                </PretendardText>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
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
    justifyContent: 'center',
    gap: 2,
  },
  rowDivided: {
    borderTopWidth: 1,
    borderTopColor: Acg.hairline,
  },
  rowTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AcgLayout.chipGap,
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
  actions: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: AcgLayout.chipGap,
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
