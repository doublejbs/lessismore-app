import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import WarehouseDetail from '../../model/warehouse-detail/WarehouseDetail';
import PretendardText from '../PretendardText';
import WarehouseDetailSectionView from './WarehouseDetailSectionView';
import { Acg, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';

interface Props {
  warehouseDetail: WarehouseDetail;
}

// 누적 시간(초) → "X시간 Y분" 표기. 1시간 미만이면 분만 표시한다.
const formatDuration = (durationSec: number): string => {
  const totalMinutes = Math.floor(durationSec / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return app.getL10n().t('gearDetail.minutes', { count: minutes });
  }

  if (minutes === 0) {
    return app.getL10n().t('gearDetail.hours', { count: hours });
  }

  return app.getL10n().t('gearDetail.hoursMinutes', { hours, minutes });
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
    { label: app.getL10n().t('gearDetail.totalDuration'), value: formatDuration(totals.durationSec) },
  ];

  if (totals.elevationGainM !== null) {
    rows.push({
      label: app.getL10n().t('gearDetail.totalElevation'),
      value: `${Math.round(totals.elevationGainM).toLocaleString(app.getL10n().language)}m`,
    });
  }

  if (totals.activeEnergyKcal !== null) {
    rows.push({
      label: app.getL10n().t('gearDetail.totalCalories'),
      value: `${Math.round(totals.activeEnergyKcal).toLocaleString(app.getL10n().language)}kcal`,
    });
  }

  return (
    <WarehouseDetailSectionView title={app.getL10n().t('gearDetail.activity')}>
      <PretendardText weight='semibold' style={styles.headlineText}>
        {app.getL10n().t('gearDetail.walkedWith', { distance: distanceKm })}
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
    ...AcgType.rowSubtitle,
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
    ...AcgType.rowSubtitle,
    color: Acg.textMuted,
  },
  rowValue: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
});

export default observer(WarehouseDetailActivityTotalsView);
