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

// 체크 배지(24pt)가 차지하는 우측 레인 폭 — GearView 지표 컬럼과의 간격 12 포함.
const CHECK_BADGE_SIZE = 24;
const CHECK_BADGE_LANE = CHECK_BADGE_SIZE + 12;

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
  // GearView 우측에 지표 컬럼(무게·사용률)이 생겼으므로, 절대배치 체크 배지가 겹치지 않도록
  // 행 오른쪽에 배지 레인(배지 24 + 간격 12)만큼 패딩을 둬 지표 컬럼이 그 앞에서 끝나게 한다.
  row: {
    width: '100%',
    paddingRight: CHECK_BADGE_LANE,
  },
  checkBadge: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  checkCircle: {
    width: CHECK_BADGE_SIZE,
    height: CHECK_BADGE_SIZE,
    borderRadius: CHECK_BADGE_SIZE / 2,
    backgroundColor: '#191F28',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default observer(BagPackingGearRowView);
