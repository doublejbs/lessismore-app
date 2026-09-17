import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import BagSnapshotSummaryCardView from '@/components/bag-snapshot/BagSnapshotSummaryCardView';
import app from '@/model/app/App';
import { formatBagSnapshotWeightInKilograms } from '@/model/bag-snapshot/BagSnapshotFormat';
import { GroupBagSnapshot } from '@/model/group/GroupData';
import {
  formatGroupDateRange,
  getGroupSyncedAtText,
} from '@/model/group-format/GroupFormat';

interface Props {
  snapshot: GroupBagSnapshot;
  nickname: string;
  isMine: boolean;
}

/**
 * 멤버 배낭 요약 카드 (GRP-5). 커뮤니티 패킹 스냅샷 카드와 **같은 공용 카드**를 쓰고
 * 문구만 그룹 것을 넘긴다 — 같은 배낭이 두 화면에서 다르게 읽히지 않게 한다.
 *
 * 스냅샷에 담기는 것만 표시한다. 메모·좌표·이동 경로·건강 기록·개인 장비 사진은
 * 데이터에 애초에 없다(DM-29 제외 목록).
 */
const GroupMemberBagSummaryView: FC<Props> = ({
  snapshot,
  nickname,
  isMine,
}) => {
  const l10n = app.getL10n();
  const dateText = formatGroupDateRange(
    snapshot.startDate ?? '',
    snapshot.endDate ?? ''
  );
  const label = isMine
    ? l10n.t('group.member.mine')
    : l10n.t('group.member.bagOf', { name: nickname });

  return (
    <BagSnapshotSummaryCardView
      label={label}
      name={snapshot.name}
      dateText={dateText}
      destinationName={snapshot.destinationName ?? ''}
      weightLabel={l10n.t('group.member.totalWeight')}
      weightText={`${formatBagSnapshotWeightInKilograms(snapshot.totalWeight)}kg`}
      gearCountText={l10n.t('group.member.gearCount', {
        count: snapshot.itemCount,
      })}
      footerText={l10n.t('group.member.syncedAt', {
        time: getGroupSyncedAtText(snapshot.syncedAt),
      })}
    />
  );
};

export default observer(GroupMemberBagSummaryView);
