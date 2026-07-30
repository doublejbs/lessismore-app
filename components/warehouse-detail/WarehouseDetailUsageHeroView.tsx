import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import WarehouseDetail from '../../model/warehouse-detail/WarehouseDetail';
import SeperaterView from '../ui/SeperaterView';
import PretendardText from '../PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';

interface Props {
  warehouseDetail: WarehouseDetail;
}

// 사용 지표 히어로(GD-9) — 보유 장비 전용. "이 장비를 계속 데려갈까"에 답하는 내 기록 요약.
// 모든 값은 이미 로드된 데이터의 파생값이다(추가 읽기 0회).
const WarehouseDetailUsageHeroView: FC<Props> = ({ warehouseDetail }) => {
  const gear = warehouseDetail.getGear();

  if (!gear) {
    return null;
  }

  const { bagCount, usedCount, uselessCount } = warehouseDetail.getUsageStats();

  const renderStat = (label: string, value: number, muted: boolean) => (
    <View style={styles.statItem}>
      <PretendardText
        weight='semibold'
        style={[styles.statValue, muted && styles.statMuted]}
      >
        {value}
      </PretendardText>
      <PretendardText style={[styles.statLabel, muted && styles.statMuted]}>
        {label}
      </PretendardText>
    </View>
  );

  return (
    <>
      <SeperaterView />
      <View style={styles.container}>
        <PretendardText weight='bold' style={styles.title}>
          사용 기록
        </PretendardText>
        {bagCount === 0 ? (
          <PretendardText style={styles.emptyText}>
            아직 배낭에 담은 적이 없어요
          </PretendardText>
        ) : (
          <>
            {/* 사용·안 씀 두 지표만 둔다(GD-9, 2026-07-30 사용자 결정).
                담김 수는 아래 `함께한 여행 N회` 헤더가 이미 같은 값을 말하고,
                미기록은 타임라인의 `미기록` 태그로 행마다 드러난다. */}
            <View style={styles.statsRow}>
              {renderStat('사용', usedCount, usedCount === 0)}
              {renderStat('안 씀', uselessCount, uselessCount === 0)}
            </View>
          </>
        )}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    paddingHorizontal: 20,
    marginVertical: 20,
  },
  title: {
    fontSize: 17,
    color: Color.textPrimary,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: Color.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: Color.inputBg,
    borderRadius: Radius.card,
    gap: 2,
  },
  statValue: {
    fontSize: 18,
    color: Color.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: Color.textSecondary,
  },
  statMuted: {
    // 0회 지표는 값·라벨을 낮춰 유효 정보 스캔을 돕는다(GD-2 톤 유지).
    color: Color.textSecondary,
  },
});

export default observer(WarehouseDetailUsageHeroView);
