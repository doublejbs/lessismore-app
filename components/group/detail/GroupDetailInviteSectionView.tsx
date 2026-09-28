import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import { StyleSheet, View } from 'react-native';
import AcgSectionHeaderView from '@/components/acg/AcgSectionHeaderView';
import GroupInviteActionView from '@/components/group/invite/GroupInviteActionView';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import Group from '@/model/group/Group';

interface Props {
  group: Group;
}

/**
 * 초대 섹션 (GRP-3). 복사 액션 자체는 공용 `GroupInviteActionView` 하나뿐이다 —
 * 링크 조립·잠금 표시·복사 토스트가 화면마다 갈라지지 않게 한다.
 */
const GroupDetailInviteSectionView: FC<Props> = ({ group }) => {
  const l10n = app.getL10n();

  return (
    <View style={styles.section}>
      <AcgSectionHeaderView title={l10n.t('group.detail.inviteTitle')} />
      <PretendardText style={styles.description}>
        {l10n.t('group.detail.inviteDescription')}
      </PretendardText>
      <GroupInviteActionView group={group} />
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginTop: AcgLayout.section,
    gap: 12,
  },
  description: {
    ...AcgType.body,
    color: Acg.textMuted,
  },
});

export default observer(GroupDetailInviteSectionView);
