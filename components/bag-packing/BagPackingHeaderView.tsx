import { FC, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import PretendardText from '@/components/PretendardText';
import BagPacking from '@/model/bag-packing/BagPacking';

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
      <View style={styles.countRow}>
        <PretendardText style={styles.countText} weight='bold'>
          {packedCount} / {totalCount}
        </PretendardText>
        <PretendardText style={styles.percentText} weight='bold'>
          {percent}%
        </PretendardText>
      </View>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, barStyle]} />
      </View>
      <PretendardText style={styles.weightText} weight='medium'>
        {packedWeight}kg / {totalWeight}kg
      </PretendardText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 10,
  },
  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  countText: {
    fontSize: 28,
    color: '#191F28',
  },
  percentText: {
    fontSize: 20,
    color: '#191F28',
  },
  barTrack: {
    width: '100%',
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F2F4F6',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: '#191F28',
  },
  weightText: {
    fontSize: 15,
    color: '#8B95A1',
  },
});

export default observer(BagPackingHeaderView);
