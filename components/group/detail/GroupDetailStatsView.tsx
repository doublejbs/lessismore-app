import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import { StyleSheet, View } from 'react-native';
import AcgDisplayText from '@/components/acg/AcgDisplayText';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import { formatBagSnapshotWeightInKilograms } from '@/model/bag-snapshot/BagSnapshotFormat';
import GroupDetail from '@/model/group-detail/GroupDetail';

interface Props {
  detail: GroupDetail;
}

// 배낭이 하나도 연결되지 않았을 때의 수치 자리. 숫자가 아니라 "값 없음"이라 0kg와 구분된다.
const EMPTY_WEIGHT = '—';

/**
 * 그룹 상세 헤더의 수치 줄 (GRP-11).
 *
 * 배낭 상세 요약(`BagDetailSummaryView`)과 같은 구성이다 — 라벨을 값 위에 두고, 이 화면에서
 * 가장 비교하고 싶은 값(일행 합계 무게)을 수치 글꼴로 크게 둔다. 무게 분해 막대는 넣지 않는다
 * (그룹에는 카테고리 분해가 없다 — 스냅샷에는 합계만 있다).
 * 옆의 `멤버 N명 · 배낭 N개`는 메타 줄이다(잉크 14 — 회색이 아니다, HM-8).
 *
 * **배낭이 하나도 연결되지 않았으면 `0kg`가 아니라 `—`다.** `0kg`는 "짐이 없다"로 읽히지만 실제로는
 * 아직 아무도 배낭을 잇지 않은 것이고, 그 사실은 옆의 `배낭 0개`가 말한다. 배낭은 이었는데
 * 장비가 없어 합이 0인 경우는 참값이라 `0kg`로 그린다.
 */
const GroupDetailStatsView: FC<Props> = ({ detail }) => {
  const l10n = app.getL10n();
  const hasLinkedBag = detail.getLinkedBagCount() > 0;
  const weightLabel = l10n.t('group.detail.totalWeightLabel');
  const weightText = hasLinkedBag
    ? `${formatBagSnapshotWeightInKilograms(detail.getTotalWeight())}kg`
    : EMPTY_WEIGHT;
  const countText = [
    l10n.t('group.detail.summaryMembers', { count: detail.getMemberCount() }),
    l10n.t('group.detail.summaryBags', { count: detail.getLinkedBagCount() }),
  ].join(l10n.t('group.detail.metaSeparator'));

  return (
    <View style={styles.container}>
      <View
        style={styles.weightBlock}
        accessible
        accessibilityLabel={`${weightLabel} ${
          hasLinkedBag ? weightText : l10n.t('group.detail.bagNotLinked')
        }`}
      >
        <PretendardText style={styles.label}>{weightLabel}</PretendardText>
        <AcgDisplayText
          style={[styles.value, !hasLinkedBag && styles.valueEmpty]}
        >
          {weightText}
        </AcgDisplayText>
      </View>
      <PretendardText style={styles.counts}>{countText}</PretendardText>
    </View>
  );
};

const styles = StyleSheet.create({
  // 수치와 메타를 한 줄에 둔다 — 메타는 수치의 바닥선 쪽에 붙여 한 덩어리로 읽힌다.
  container: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    columnGap: 16,
    rowGap: 4,
  },
  weightBlock: {
    gap: 2,
  },
  label: {
    ...AcgType.meta,
    color: Acg.textMuted,
  },
  value: {
    ...AcgType.displayLarge,
    color: Acg.ink,
  },
  valueEmpty: {
    color: Acg.textMuted,
  },
  // 수치(줄간 34)의 바닥선 근처에 맞춘다 — 메타 줄(20)이 수치 글자 아래쪽과 나란히 선다.
  counts: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
    paddingBottom: 3,
  },
});

export default observer(GroupDetailStatsView);
