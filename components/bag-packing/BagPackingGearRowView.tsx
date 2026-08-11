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
import { Acg } from '@/constants/DesignTokens';

interface Props {
  // 위 행과 가르는 헤어라인(목록 첫 행에는 없다).
  divided?: boolean;
  gear: Gear;
  bagPacking: BagPacking;
}

// 체크 배지(24pt)가 차지하는 우측 레인 폭 — GearView 지표 컬럼과의 간격 12 포함.
const CHECK_BADGE_SIZE = 24;
const CHECK_BADGE_LANE = CHECK_BADGE_SIZE + 12;
// 행 좌우 여백 — 다른 목록 행(홈·창고)과 같은 값.
const ROW_PADDING = 14;

const SPRING_CONFIG = {
  damping: 16,
  stiffness: 160,
  // 오버슈트 제거 — 체크가 과장되게 커졌다 줄어드는 바운스를 없앤다(스프링 가속감은 유지).
  overshootClamping: true,
};

const BagPackingGearRowView: FC<Props> = ({
  gear,
  bagPacking,
  divided = false,
}) => {
  const packed = bagPacking.isPacked(gear);
  const progress = useSharedValue(packed ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(packed ? 1 : 0, SPRING_CONFIG);
  }, [packed, progress]);

  const rowStyle = useAnimatedStyle(() => ({
    // 챙긴 행을 0.4까지 흐리면 종이 면 위에서 글자가 거의 안 읽힌다 — 상태는 체크 원이 말한다.
    opacity: interpolate(progress.value, [0, 1], [1, 0.65]),
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
      {/* 흐림은 **안쪽 콘텐츠에만** 준다 — 종이 면까지 흐려지면 카드가 지면에 반쯤
          잠긴 것처럼 보여 경계가 흐려진다(2026-08-04 시뮬레이터 확인). */}
      <View style={[styles.row, divided && styles.divided]}>
        <Animated.View style={rowStyle}>
          <GearView gear={gear} plain />
        </Animated.View>
      </View>
      {/* 빈 원은 항상 보인다 — 챙기기 전에도 이 행이 고를 수 있는 항목임을 드러낸다.
          채움(잉크 원 + 체크)만 챙길 때 스프링으로 나타난다. */}
      <View style={styles.checkBadge} pointerEvents='none'>
        <View style={styles.checkOutline} />
        <Animated.View style={[styles.checkCircle, checkStyle]}>
          <Ionicons name='checkmark' size={16} color={Acg.paper} />
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchable: {
    width: '100%',
  },
  // 절대배치 체크 배지가 지표 컬럼(무게·사용률)과 겹치지 않도록 행 오른쪽에 배지 레인을
  // 비운다. 체크까지 한 장의 종이 면에 담는다(ACG) — 배지만 지면 위에 떨어지면 따로 논다.
  /**
   * 면을 두지 않는다(2026-08-11 레퍼런스 목록 문법) — 순백 지면에 행이 직접 놓이고 위 행과는
   * 헤어라인으로 갈린다. 우측에는 체크 배지 레인을 비워 배지가 메타 줄과 겹치지 않게 한다.
   */
  row: {
    width: '100%',
    paddingLeft: ROW_PADDING,
    paddingRight: ROW_PADDING + CHECK_BADGE_LANE,
  },
  divided: {
    borderTopWidth: 1,
    borderTopColor: Acg.hairline,
  },
  checkBadge: {
    position: 'absolute',
    right: ROW_PADDING,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  // 빈 상태의 테두리 원 — 채움 원과 정확히 같은 자리에 겹쳐 둔다.
  checkOutline: {
    width: CHECK_BADGE_SIZE,
    height: CHECK_BADGE_SIZE,
    borderRadius: CHECK_BADGE_SIZE / 2,
    borderWidth: 1.5,
    borderColor: Acg.line,
  },
  checkCircle: {
    position: 'absolute',
    width: CHECK_BADGE_SIZE,
    height: CHECK_BADGE_SIZE,
    borderRadius: CHECK_BADGE_SIZE / 2,
    backgroundColor: Acg.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default observer(BagPackingGearRowView);
