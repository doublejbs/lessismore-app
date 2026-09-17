import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import { StyleSheet, View } from 'react-native';
import AcgSectionHeaderView from '@/components/acg/AcgSectionHeaderView';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import GroupDetail from '@/model/group-detail/GroupDetail';

interface Props {
  detail: GroupDetail;
}

/**
 * 지도 포인트 섹션 (GRP-9) — **목록 자리와 비어 있음 문구만 있는 상태다.**
 *
 * 포인트 행·유형 필터·지도 이동은 지도 태스크가 이 컴포넌트 안을 채운다
 * (`GroupStore.getPoints` / `createPoint` / `updatePoint` / `deletePoint`를 쓴다).
 */
const GroupDetailPointSectionView: FC<Props> = ({ detail }) => {
  const l10n = app.getL10n();
  const group = detail.getGroup();

  if (!group) {
    return null;
  }

  return (
    <View style={styles.section}>
      <AcgSectionHeaderView title={l10n.t('group.detail.pointsTitle')} />
      <PretendardText style={styles.empty}>
        {l10n.t('group.detail.pointsEmpty')}
      </PretendardText>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginTop: AcgLayout.section,
  },
  empty: {
    ...AcgType.body,
    color: Acg.textMuted,
    paddingVertical: 12,
  },
});

export default observer(GroupDetailPointSectionView);
