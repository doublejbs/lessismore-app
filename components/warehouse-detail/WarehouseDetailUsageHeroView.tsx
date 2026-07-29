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

  const { bagCount, usedCount, uselessCount, unrecordedCount } =
    warehouseDetail.getUsageStats();
  const ownedDays = warehouseDetail.getOwnedDays();
  // 사용률의 모수 — 정의(`used/(used+useless)`)상 미기록은 분모에서 빠진다(GD-9).
  // 위 지표와 같은 `getUsageStats()`(실제 로드된 배낭 기준)에서 뽑아야 화면 안에서 어긋나지 않는다.
  const recordedCount = usedCount + uselessCount;
  // 사용률·보유 일수를 한 줄 보조 문구로 합친다. 둘 다 없으면 라인 미노출.
  const footerParts: string[] = [];

  // 기록이 하나도 없으면 미표시. 모수를 병기하지 않으면 6번 담고 2번만 기록한 장비가
  // `사용률 100%`로 보여 "여섯 번 다 썼다"로 읽힌다(GD-9).
  // 모수는 점으로 나열하지 않고 괄호로 묶어 사용률에 붙인다 — 나열하면 `사용률 100% ·
  // 2건 기준 · 보유 244일째`처럼 덩어리가 셋이 되어 읽기 부담이 커진다(GD-9).
  if (recordedCount > 0) {
    const usedRate = Math.round((usedCount / recordedCount) * 100);

    footerParts.push(`사용률 ${usedRate}%(${recordedCount}건)`);
  }

  if (ownedDays !== null) {
    footerParts.push(`보유 ${ownedDays.toLocaleString()}일째`);
  }

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
            <View style={styles.statsRow}>
              {renderStat('담김', bagCount, false)}
              {renderStat('사용', usedCount, usedCount === 0)}
              {renderStat('안 씀', uselessCount, uselessCount === 0)}
              {/* 미기록은 0이면 숨긴다(GD-9). '안 씀'으로 합산하지 않는다(3-상태 원칙). */}
              {unrecordedCount > 0 &&
                renderStat('미기록', unrecordedCount, false)}
            </View>
            {footerParts.length > 0 && (
              <PretendardText style={styles.footerText}>
                {footerParts.join(' · ')}
              </PretendardText>
            )}
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
  footerText: {
    marginTop: 10,
    fontSize: 13,
    color: Color.textSecondary,
  },
});

export default observer(WarehouseDetailUsageHeroView);
