import { FC, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import GearView from '@/components/warehouse/GearView';
import Gear from '@/model/gear/Gear';
import BagPacking from '@/model/bag-packing/BagPacking';

interface Props {
  gear: Gear;
  bagPacking: BagPacking;
}

const SPRING_CONFIG = {
  damping: 16,
  stiffness: 160,
  // 오버슈트 제거 — 체크가 과장되게 커졌다 줄어드는 바운스를 없앤다(스프링 가속감은 유지).
  overshootClamping: true,
};

const BagPackingGearRowView: FC<Props> = ({ gear, bagPacking }) => {
  const packed = bagPacking.isPacked(gear);
  const progress = useSharedValue(packed ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(packed ? 1 : 0, SPRING_CONFIG);
  }, [packed, progress]);

  const rowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [1, 0.4]),
  }));

  const checkStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.6, 1]) }],
  }));

  const handlePress = () => {
    bagPacking.togglePacked(gear);
  };

  return (
    <TouchableOpacity
      style={styles.touchable}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Animated.View style={[styles.row, rowStyle]}>
        <GearView gear={gear} />
      </Animated.View>
      <Animated.View style={[styles.checkBadge, checkStyle]} pointerEvents='none'>
        <View style={styles.checkCircle}>
          <Ionicons name='checkmark' size={16} color='white' />
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchable: {
    width: '100%',
  },
  row: {
    width: '100%',
  },
  checkBadge: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#191F28',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default observer(BagPackingGearRowView);
