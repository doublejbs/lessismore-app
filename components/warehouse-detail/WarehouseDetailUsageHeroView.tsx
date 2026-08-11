import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import WarehouseDetail from '../../model/warehouse-detail/WarehouseDetail';
import PretendardText from '../PretendardText';
import WarehouseDetailSectionView from './WarehouseDetailSectionView';
import { Acg, AcgFontSize } from '@/constants/DesignTokens';
import AcgDisplayText from '@/components/acg/AcgDisplayText';

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

  const renderStat = (
    label: string,
    value: number,
    muted: boolean,
    divided = false
  ) => (
    <View style={[styles.statItem, divided && styles.statDivided]}>
      {/* 숫자라 콘덴스드로 키운다 — 두 지표가 이 섹션의 앵커(ACG). */}
      <AcgDisplayText style={[styles.statValue, muted && styles.statMuted]}>
        {String(value)}
      </AcgDisplayText>
      <PretendardText style={[styles.statLabel, muted && styles.statMuted]}>
        {label}
      </PretendardText>
    </View>
  );

  return (
    <WarehouseDetailSectionView title='사용 기록'>
      {bagCount === 0 ? (
        <PretendardText style={styles.emptyText}>
          아직 배낭에 담은 적이 없어요
        </PretendardText>
      ) : (
        <>
          {/* 사용·사용 안함 두 지표만 둔다(GD-9, 2026-07-30 사용자 결정).
                담김 수는 아래 `함께한 여행 N회` 헤더가 이미 같은 값을 말하고,
                미기록은 타임라인의 `미기록` 태그로 행마다 드러난다. */}
          <View style={styles.statsRow}>
            {renderStat('사용', usedCount, usedCount === 0)}
            {renderStat('사용 안함', uselessCount, uselessCount === 0, true)}
          </View>
        </>
      )}
    </WarehouseDetailSectionView>
  );
};

const styles = StyleSheet.create({
  emptyText: {
    fontSize: 14,
    color: Acg.textMuted,
  },
  statsRow: {
    flexDirection: 'row',
  },
  /**
   * 지표는 **면을 나누지 않고 세로 헤어라인으로 가른다**(2026-08-12). 타일 두 장을 8px 띄우면
   * 섹션 면 안에 면이 또 생겨 층이 하나 늘어난다 — 홈 일정 카드의 `총 무게 | 예보`와 같은 문법이다.
   */
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    gap: 2,
  },
  statDivided: {
    borderLeftWidth: 1,
    borderLeftColor: Acg.hairline,
  },
  statValue: {
    fontSize: 22,
    lineHeight: 28,
    color: Acg.ink,
  },
  statLabel: {
    fontSize: AcgFontSize.meta,
    color: Acg.textMuted,
  },
  statMuted: {
    // 0회 지표는 값·라벨을 낮춰 유효 정보 스캔을 돕는다(GD-2 톤 유지).
    color: Acg.textMuted,
  },
});

export default observer(WarehouseDetailUsageHeroView);
