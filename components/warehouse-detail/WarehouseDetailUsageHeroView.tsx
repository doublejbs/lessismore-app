import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import WarehouseDetail from '../../model/warehouse-detail/WarehouseDetail';
import PretendardText from '../PretendardText';
import WarehouseDetailSectionView from './WarehouseDetailSectionView';
import LiquidCard from '@/components/liquid/LiquidCard';
import LiquidStatTile from '@/components/liquid/LiquidStatTile';
import { Liquid, LiquidLayout, LiquidType } from '@/constants/DesignTokens';

interface Props {
  warehouseDetail: WarehouseDetail;
}

/**
 * 사용 지표 히어로(GD-9) — 보유 장비 전용. "이 장비를 계속 데려갈까"에 답하는 내 기록 요약.
 * 모든 값은 이미 로드된 데이터의 파생값이다(추가 읽기 0회).
 *
 * **화면의 라임 면은 이 타일 하나뿐이고, 그 값이 1 이상일 때만 채운다**(목업 §9 · 2026-08-11
 * 디자인 리뷰) — 지표 줄의 첫 타일이 화면에서 가장 먼저 답해야 하는 값(`사용`)을 든다.
 * 형광펜 띠로 섹션 제목을 강조하던 ACG 문법은 라임 면이 대신하므로 함께 걷었다.
 */
const WarehouseDetailUsageHeroView: FC<Props> = ({ warehouseDetail }) => {
  const gear = warehouseDetail.getGear();

  if (!gear) {
    return null;
  }

  const { bagCount, usedCount, uselessCount } = warehouseDetail.getUsageStats();

  return (
    <WarehouseDetailSectionView title='사용 기록' variant='list'>
      {bagCount === 0 ? (
        // 지표 대신 안내만 오는 경우 — 타일과 같은 모서리를 쓰되 조용한 면으로 낮춘다.
        // 빈 상태는 **사실 + 다음 걸음** 두 줄이다(핸드오프 카피 규칙) — 첫 줄만 두면
        // 왜 비었는지는 알려주면서 무엇을 하면 채워지는지는 말하지 않는다.
        <LiquidCard tone='quiet' radius='tile'>
          <PretendardText style={styles.emptyText}>
            아직 배낭에 담은 적이 없어요
          </PretendardText>
          <PretendardText style={styles.emptyHintText}>
            다음 여행 배낭에 담아볼까요?
          </PretendardText>
        </LiquidCard>
      ) : (
        // 사용·안 쓴 장비 두 지표만 둔다(GD-9, 2026-07-30 사용자 결정) — 목업 §9의 세 번째
        // 타일(`여행`)은 아래 `함께한 여행 N회` 헤더가 같은 값을 말해 그때 걷어낸 지표다.
        <View style={styles.statsRow}>
          {/* **값이 0이면 라임 면을 걷는다**(2026-08-11 디자인 리뷰). 화면 유일한 라임 면이
              `0 사용`에 놓이면 최대 강조가 "기록 없음"을 가리켜 뭔가 달성한 것처럼 읽힌다 —
              셀 것이 있을 때만 채우고, 그 전에는 흰 면 + 한 단계 낮춘 숫자로 둔다. */}
          <LiquidStatTile
            value={usedCount}
            label='사용'
            tone={usedCount > 0 ? 'accent' : 'paper'}
            dim={usedCount === 0}
          />
          {/* 창고 칩(WH-2-1)·내 정보 지표와 같은 말을 쓴다 — 예전 `사용 안함`은 같은 뜻을
              화면마다 다르게 말했다(2026-08-11 사용자 결정). */}
          <LiquidStatTile
            value={uselessCount}
            label='안 쓴 장비'
            dim={uselessCount === 0}
          />
        </View>
      )}
    </WarehouseDetailSectionView>
  );
};

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    gap: LiquidLayout.listGap,
  },
  emptyText: {
    fontSize: LiquidType.bodySm.fontSize,
    lineHeight: LiquidType.bodySm.lineHeight,
    color: Liquid.inkTertiary,
  },
  // 다음 걸음은 사실보다 한 단계 옅게 — 두 줄이 같은 무게면 어느 쪽이 상황인지 흐려진다.
  emptyHintText: {
    marginTop: 2,
    fontSize: LiquidType.caption.fontSize,
    lineHeight: LiquidType.caption.lineHeight,
    color: Liquid.inkSubtle,
  },
});

export default observer(WarehouseDetailUsageHeroView);
