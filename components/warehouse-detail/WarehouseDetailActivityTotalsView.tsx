import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import WarehouseDetail from '../../model/warehouse-detail/WarehouseDetail';
import PretendardText from '../PretendardText';
import WarehouseDetailSectionView from './WarehouseDetailSectionView';
import { Acg, AcgFontSize } from '@/constants/DesignTokens';

interface Props {
  warehouseDetail: WarehouseDetail;
}

// 누적 시간(초) → "X시간 Y분" 표기. 1시간 미만이면 분만 표시한다.
const formatDuration = (durationSec: number): string => {
  const totalMinutes = Math.floor(durationSec / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}분`;
  }

  if (minutes === 0) {
    return `${hours}시간`;
  }

  return `${hours}시간 ${minutes}분`;
};

// 함께한 활동 누적(GD-11) — 사용(used)한 여행의 운동 기록(DM-22)을 합산해 보여준다.
// 합산 대상이 하나도 없으면 섹션을 렌더하지 않는다.
const WarehouseDetailActivityTotalsView: FC<Props> = ({ warehouseDetail }) => {
  const totals = warehouseDetail.getActivityTotals();

  if (!totals) {
    return null;
  }

  const distanceKm = (totals.distanceM / 1000).toFixed(1);
  const rows: { label: string; value: string }[] = [
    { label: '누적 시간', value: formatDuration(totals.durationSec) },
  ];

  if (totals.elevationGainM !== null) {
    rows.push({
      label: '누적 상승고도',
      value: `${Math.round(totals.elevationGainM).toLocaleString()}m`,
    });
  }

  if (totals.activeEnergyKcal !== null) {
    rows.push({
      label: '누적 칼로리',
      value: `${Math.round(totals.activeEnergyKcal).toLocaleString()}kcal`,
    });
  }

  return (
    <WarehouseDetailSectionView title='함께한 활동'>
      <PretendardText weight='semibold' style={styles.headlineText}>
        이 장비와 {distanceKm}km를 걸었어요
      </PretendardText>
      <View style={styles.rowsContainer}>
        {rows.map((row, index) => (
          <View
            key={row.label}
            style={[styles.row, index > 0 && styles.rowDivider]}
          >
            <PretendardText style={styles.rowLabel}>{row.label}</PretendardText>
            <PretendardText weight='medium' style={styles.rowValue}>
              {row.value}
            </PretendardText>
          </View>
        ))}
      </View>
    </WarehouseDetailSectionView>
  );
};

const styles = StyleSheet.create({
  headlineText: {
    fontSize: AcgFontSize.rowSubtitle,
    color: Acg.ink,
  },
  rowsContainer: {
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: Acg.hairline,
  },
  rowLabel: {
    fontSize: 14,
    color: Acg.textMuted,
  },
  rowValue: {
    fontSize: 14,
    color: Acg.ink,
  },
});

export default observer(WarehouseDetailActivityTotalsView);
