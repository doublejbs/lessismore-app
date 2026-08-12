import { FC, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import BagPacking from '@/model/bag-packing/BagPacking';
import AcgDisplayText from '@/components/acg/AcgDisplayText';
import { Acg, AcgLayout, AcgType } from '@/constants/DesignTokens';

interface Props {
  bagPacking: BagPacking;
}

const BagPackingHeaderView: FC<Props> = ({ bagPacking }) => {
  const packedCount = bagPacking.getPackedCount();
  const totalCount = bagPacking.getTotalCount();
  const percent = bagPacking.getProgressPercent();
  const packedWeight = bagPacking.getPackedWeight();
  const totalWeight = bagPacking.getTotalWeight();
  const progress = useSharedValue(percent);

  useEffect(() => {
    progress.value = withSpring(percent, {
      damping: 18,
      stiffness: 120,
      // 오버슈트 제거 — 바가 목표치를 지나쳤다 돌아오는 과장 바운스를 없앤다.
      overshootClamping: true,
    });
  }, [percent, progress]);

  const barStyle = useAnimatedStyle(() => ({
    // 스프링 오버슈트로 0 미만/100 초과가 되면 width 퍼센트가 무효 값이 되어
    // 순간 풀폭으로 렌더되는 버그가 있어 0~100으로 클램프한다.
    width: `${Math.min(100, Math.max(0, progress.value))}%`,
  }));

  return (
    <View style={styles.container}>
      {/* 숫자라 콘덴스드를 쓴다 — 이 화면의 시각 앵커(ACG). */}
      <View style={styles.countRow}>
        <AcgDisplayText style={styles.countText}>
          {`${packedCount} / ${totalCount}`}
        </AcgDisplayText>
        <AcgDisplayText style={styles.percentText}>
          {`${percent}%`}
        </AcgDisplayText>
      </View>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, barStyle]} />
      </View>
      <AcgDisplayText style={styles.weightText}>
        {`${packedWeight}kg / ${totalWeight}kg`}
      </AcgDisplayText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: AcgLayout.screenH,
    paddingBottom: 16,
    gap: 10,
  },
  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  countText: {
    // 옆 percentText와 나란히 비교하는 콘덴스드 수치라 같은 단·같은 트래킹을 쓴다.
    ...AcgType.displaySmall,
    color: Acg.ink,
  },
  // 진행률은 라임 — 이 화면에서 유일한 액센트다(ACG).
  percentText: {
    ...AcgType.displaySmall,
    color: Acg.limeText,
  },
  // 각진 진행 바(ACG). 채움은 라임이라 남은 양이 한눈에 갈린다.
  barTrack: {
    width: '100%',
    height: 10,
    backgroundColor: Acg.hairline,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: Acg.lime,
  },
  weightText: {
    ...AcgType.sectionSubtitle,
    color: Acg.textMuted,
  },
});

export default observer(BagPackingHeaderView);
