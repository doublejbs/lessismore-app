import { FC, ReactNode } from 'react';
import { observer } from 'mobx-react-lite';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AcgDisplayText from '@/components/acg/AcgDisplayText';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgRadius, AcgType } from '@/constants/DesignTokens';

interface Props {
  label: string;
  name: string;
  // 기간·여행지·아래 한 줄은 없으면 빈 문자열로 넘긴다 — 그 줄을 그리지 않는다.
  dateText: string;
  destinationName: string;
  weightLabel: string;
  weightText: string;
  gearCountText: string;
  // 카드 맨 위 지도 밴드(`SnapshotMapBandView`). 좌표가 있는 스냅샷만 넘긴다.
  mapBand?: ReactNode;
  // 지표 아래 붙는 추가 구역(커뮤니티 날씨 등).
  children?: ReactNode;
  // 카드 맨 아래 한 줄(그룹 스냅샷 기준 시각 등).
  footerText?: string;
  // 카드 전체를 한 덩이로 읽히게 할 때만 넘긴다.
  accessibilityLabel?: string;
}

/**
 * 배낭 스냅샷 요약 카드 (CM-4 · GRP-5).
 *
 * 순백 지면 위 연회색 면 + 모서리 12, **그림자 없음**(HM-8). 커뮤니티 패킹 스냅샷 카드와
 * 그룹 일행 배낭 카드가 같은 배치를 그리므로 마크업·치수를 한 곳에 둔다.
 * 스냅샷에 담기는 것만 표시한다 — 메모·좌표·이동 경로·건강 기록은 데이터에 애초에 없다.
 */
const BagSnapshotSummaryCardView: FC<Props> = ({
  label,
  name,
  dateText,
  destinationName,
  weightLabel,
  weightText,
  gearCountText,
  mapBand,
  children,
  footerText,
  accessibilityLabel,
}) => {
  return (
    <View
      style={styles.card}
      accessible={!!accessibilityLabel}
      {...(accessibilityLabel ? { accessibilityLabel } : {})}
    >
      {mapBand}
      <View style={styles.content}>
        <PretendardText style={styles.label}>{label}</PretendardText>
        <PretendardText weight='semibold' style={styles.name} numberOfLines={2}>
          {name}
        </PretendardText>
        {dateText ? (
          <PretendardText style={styles.meta} numberOfLines={1}>
            {dateText}
          </PretendardText>
        ) : null}
        {destinationName ? (
          <View style={styles.destinationRow}>
            <Ionicons name='location-outline' size={14} color={Acg.textMuted} />
            <PretendardText style={styles.meta} numberOfLines={1}>
              {destinationName}
            </PretendardText>
          </View>
        ) : null}
        <View style={styles.stats}>
          <View style={styles.weightBlock}>
            <PretendardText style={styles.statLabel}>
              {weightLabel}
            </PretendardText>
            <AcgDisplayText style={styles.weight}>{weightText}</AcgDisplayText>
          </View>
          <PretendardText style={styles.gearCount}>
            {gearCountText}
          </PretendardText>
        </View>
        {children}
        {footerText ? (
          <PretendardText style={styles.footer}>{footerText}</PretendardText>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginTop: AcgLayout.communityCardGap,
    overflow: 'hidden',
    backgroundColor: Acg.controlFill,
    borderRadius: AcgRadius.thumb,
  },
  content: { padding: AcgLayout.communityCardPadding },
  label: { ...AcgType.meta, color: Acg.textMuted },
  name: { ...AcgType.sectionTitle, color: Acg.ink, marginTop: 4 },
  meta: { ...AcgType.rowSubtitle, color: Acg.textMuted },
  destinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AcgLayout.chipGap,
  },
  stats: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 12 },
  weightBlock: { gap: 2 },
  statLabel: { ...AcgType.meta, color: Acg.textMuted },
  weight: { ...AcgType.displayMedium, color: Acg.ink },
  gearCount: {
    ...AcgType.rowSubtitle,
    color: Acg.textMuted,
    marginLeft: 12,
    marginBottom: 2,
  },
  footer: { ...AcgType.meta, color: Acg.textMuted, marginTop: 12 },
});

export default observer(BagSnapshotSummaryCardView);
