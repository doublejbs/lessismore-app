import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import app from '@/model/app/App';
import Group from '@/model/group/Group';
import { formatGroupDateRange } from '@/model/group-format/GroupFormat';
import PretendardText from '@/components/PretendardText';
import AcgDisplayText from '@/components/acg/AcgDisplayText';
import { Acg, AcgRow, AcgType } from '@/constants/DesignTokens';

interface Props {
  group: Group;
  divided?: boolean;
}

/**
 * 그룹 목록 행 (GRP-1). HM-8 목록 행 문법 — 이름 16 medium(2줄) + 메타 14 잉크 한 줄.
 * 배지·칩을 행 안에 두지 않는다. 배낭 연결 여부도 메타 줄의 조각이다.
 */
const GroupListRowView: FC<Props> = ({ group, divided = false }) => {
  const router = useRouter();
  const l10n = app.getL10n();
  // 기간 표기는 상세·멤버 배낭 카드와 같은 단일 소스를 쓴다(로케일마다 형식이 다르다).
  const dateText = formatGroupDateRange(
    group.getStartDate(),
    group.getEndDate()
  );
  const destinationName = group.getDestinationName();
  const metaParts = [
    ...(destinationName ? [destinationName] : []),
    l10n.t('group.list.memberCount', { count: group.getMemberCount() }),
    group.hasMyBag()
      ? l10n.t('group.list.bagLinked')
      : l10n.t('group.list.bagNotLinked'),
  ];
  const metaText = ` · ${metaParts.join(' · ')}`;

  const handlePress = () => {
    app.getAnalyticsManager()?.logClick('group_open');
    router.push({ pathname: '/group/[id]', params: { id: group.getId() } });
  };

  return (
    <TouchableOpacity
      style={[styles.row, divided && styles.divided]}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole='button'
      accessibilityLabel={`${group.getName()}, ${dateText}${metaText}`}
    >
      <PretendardText weight='medium' style={styles.name} numberOfLines={2}>
        {group.getName()}
      </PretendardText>
      {/* 숫자를 맨 앞에 두고 숫자 조각만 콘덴스드로 갈아 끼운다(HM-8). */}
      <PretendardText style={styles.meta} numberOfLines={1}>
        <AcgDisplayText style={styles.metaNumber}>{dateText}</AcgDisplayText>
        {metaText}
      </PretendardText>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    minHeight: AcgRow.minHeight,
    justifyContent: 'center',
    gap: 2,
    paddingVertical: AcgRow.paddingVertical,
  },
  divided: {
    borderTopWidth: 1,
    borderTopColor: Acg.hairline,
  },
  name: {
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
});

export default observer(GroupListRowView);
