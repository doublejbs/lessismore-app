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
import { Acg, AcgShadow } from '@/constants/DesignTokens';

interface Props {
  gear: Gear;
  bagUseless: BagUseless;
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
        <GearView gear={gear} plain />
      </Animated.View>
      <Animated.View
        style={[styles.checkBadge, checkStyle]}
        pointerEvents='none'
      >
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
  // 체크 배지까지 한 장의 종이 면에 담는다(ACG) — 배지만 지면 위에 떨어지면 행과 따로 논다.
  row: {
    width: '100%',
    paddingRight: CHECK_BADGE_LANE,
    paddingHorizontal: 14,
    backgroundColor: Acg.paper,
    boxShadow: AcgShadow.paper,
  },
  checkBadge: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  checkCircle: {
    width: CHECK_BADGE_SIZE,
    height: CHECK_BADGE_SIZE,
    borderRadius: CHECK_BADGE_SIZE / 2,
    backgroundColor: Acg.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default observer(BagUselessGearView);
