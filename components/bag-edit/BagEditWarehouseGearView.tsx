import { FC, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import Gear from '../../model/gear/Gear';
import BagEdit from '../../model/bag-edit/BagEdit';
import app from '../../model/app/App';
import GearView from '../warehouse/GearView';
import { Color } from '@/constants/DesignTokens';

interface Props {
  gear: Gear;
  bagEdit: BagEdit;
}

const SPRING_CONFIG = {
  damping: 16,
  stiffness: 160,
};

// 선택 UX를 패킹/사용여부 화면과 통일: 원형 체크 배지(선택 시 채워지며 팝).
// 단 편집은 창고 전체를 훑는 맥락이라 행 dim은 쓰지 않고, 미선택엔 빈 원으로 담기 어포던스를 남긴다.
const BagEditWarehouseGearView: FC<Props> = ({ gear, bagEdit }) => {
  const isSelected = bagEdit.hasGear(gear);
  const progress = useSharedValue(isSelected ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(isSelected ? 1 : 0, SPRING_CONFIG);
  }, [isSelected, progress]);

  const checkStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.6, 1]) }],
  }));

  const handlePress = () => {
    app.getAnalyticsManager()?.logClick('gear_toggle', { added: !isSelected });
    bagEdit.toggleGear(gear);
  };

  return (
    <GearView gear={gear} onPress={handlePress}>
      <TouchableOpacity
        style={styles.badge}
        onPress={handlePress}
        hitSlop={8}
        accessibilityRole='button'
        accessibilityLabel={`${gear.getDisplayName()} 배낭에 ${
          isSelected ? '빼기' : '담기'
        }`}
      >
        <View style={styles.hollowCircle} />
        <Animated.View style={[styles.checkCircle, checkStyle]}>
          <Ionicons name='checkmark' size={16} color={Color.background} />
        </Animated.View>
      </TouchableOpacity>
    </GearView>
  );
};

const styles = StyleSheet.create({
  badge: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hollowCircle: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Color.chipInactiveBg,
  },
  checkCircle: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 14,
    backgroundColor: Color.chipActiveBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default observer(BagEditWarehouseGearView);
