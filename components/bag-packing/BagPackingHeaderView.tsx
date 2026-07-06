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
    });
  }, [percent, progress]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
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
