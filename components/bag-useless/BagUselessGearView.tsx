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
import GearView from '../warehouse/GearView';
import Gear from '../../model/gear/Gear';
import BagUseless from '../../model/bag-useless/BagUseless';
import { Color } from '@/constants/DesignTokens';

interface Props {
  gear: Gear;
  bagUseless: BagUseless;
}

const SPRING_CONFIG = {
  damping: 16,
  stiffness: 160,
  // 오버슈트 제거 — 체크가 과장되게 커졌다 줄어드는 바운스를 없앤다(스프링 가속감은 유지).
  overshootClamping: true,
};

// 패킹 모드 행과 동일한 인터랙션: 원형 체크 + 행 dim.
// (패킹은 '챙긴' 항목을 흐리게 하지만, 여기선 '안 쓴'(미선택) 장비가 흐려진다.)
const BagUselessGearView: FC<Props> = ({ gear, bagUseless }) => {
  const selected = bagUseless.isSelected(gear);
  const progress = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(selected ? 1 : 0, SPRING_CONFIG);
  }, [selected, progress]);

  const rowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.4, 1]),
  }));

  const checkStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.6, 1]) }],
  }));

  const handlePress = () => {
    bagUseless.toggle(gear);
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
    backgroundColor: Color.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default observer(BagUselessGearView);
