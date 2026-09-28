import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import { StyleSheet } from 'react-native';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import GroupDetail from '@/model/group-detail/GroupDetail';

interface Props {
  detail: GroupDetail;
}

/**
 * 그룹 상세 헤더의 일행 요약 줄 (GRP-5·GRP-11): `멤버 N명 · 배낭 N개`.
 *
 * 합계 무게는 두지 않는다(2026-09-25 사용자 결정) — 일행의 무게를 더한 값은 비교할 대상이 없어
 * 읽히지 않는다. 각자의 무게는 일행 배낭 행이 보여준다. 이 화면의 시각 앵커는 상단 지도 밴드다.
 * 메타 줄이라 잉크 14다(회색이 아니다, HM-8).
 */
const GroupDetailStatsView: FC<Props> = ({ detail }) => {
  const l10n = app.getL10n();
  const countText = [
    l10n.t('group.detail.summaryMembers', { count: detail.getMemberCount() }),
    l10n.t('group.detail.summaryBags', { count: detail.getLinkedBagCount() }),
  ].join(l10n.t('group.detail.metaSeparator'));

  return <PretendardText style={styles.counts}>{countText}</PretendardText>;
};

const styles = StyleSheet.create({
  counts: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
    marginTop: 12,
  },
});

export default observer(GroupDetailStatsView);
