import { FC, useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import Gear from '@/model/gear/Gear';
import {
  formatGearWeightOrNull,
  MISSING_WEIGHT_LABEL,
} from '@/model/gear/WeightFormat';
import BagPacking from '@/model/bag-packing/BagPacking';
import LiquidMetricRow from '@/components/liquid/LiquidMetricRow';
import {
  Liquid,
  LiquidLayout,
  LiquidMotion,
  LiquidRadius,
  LiquidShadow,
} from '@/constants/DesignTokens';

interface Props {
  gear: Gear;
  bagPacking: BagPacking;
}

// 체크 원 지름(목업 §7). 26은 시각 크기이고 터치 타깃은 행 전체다(PK-2).
const CHECK_SIZE = 26;

/**
 * PK-2 패킹 행 (Liquid Depth, 목업 §7).
 *
 * 행 하나가 곧 카드다 — 미체크는 **흰 종이 면 + 그림자**로 떠 있고, 챙기면 **가라앉은 면**
 * (`surfaceDone`, 그림자 없음) + 본문 낮춤으로 내려앉는다. 챙긴 항목을 목록에서 지우거나
 * 자리를 바꾸지 않는다 — 물건을 찾을 때 위치 기억이 깨지면 안 된다.
 *
 * 체크 채움만 스프링으로 자란다(`overshootClamping` — 목표를 지나쳤다 돌아오면 값이 틀린
 * 것처럼 보인다). Reanimated 대신 RN `Animated`를 쓴다 — 진행 바(`LiquidProgressBar`)와
 * 한 화면에서 같은 스프링 설정으로 같이 움직여야 해서, 두 애니메이션 런타임에 갈라 두면
 * 같은 값을 말하는 체크와 바가 미세하게 어긋난다.
 */
const BagPackingGearRowView: FC<Props> = ({ gear, bagPacking }) => {
  const packed = bagPacking.isPacked(gear);
  // 무게가 없으면 행이 `무게 미입력`을 그리므로 라벨도 같은 말을 읽는다(DM-26).
  const weight = formatGearWeightOrNull(gear.getWeight());
  const weightLabel = weight ?? MISSING_WEIGHT_LABEL;
  // 생성 시점 값이 현재 상태 — 재마운트되어도 애니메이션 없이 맞는 그림에서 시작한다.
  const [fill] = useState(() => new Animated.Value(packed ? 1 : 0));
  const animatedPacked = useRef(packed);

  useEffect(() => {
    // 마운트 직후와 무관한 리렌더에서는 이미 목표에 있다 — 스프링을 새로 쏘지 않는다.
    if (animatedPacked.current === packed) {
      return;
    }

    animatedPacked.current = packed;

    const animation = Animated.spring(fill, {
      toValue: packed ? 1 : 0,
      ...LiquidMotion.spring,
      useNativeDriver: true,
    });

    animation.start();

    // 토글이 연달아 들어오거나 행이 사라질 때 진행 중인 스프링을 남기지 않는다.
    return () => {
      animation.stop();
    };
  }, [packed, fill]);

  const handlePress = () => {
    bagPacking.togglePacked(gear);
  };

  // 빈 원은 항상 보인다 — 챙기기 전에도 이 행이 고를 수 있는 항목임을 드러낸다.
  // 채움(잉크 원 + 라임 체크)만 스프링으로 나타난다.
  const renderCheck = () => (
    <View style={styles.checkSlot} pointerEvents='none'>
      <View style={styles.checkOutline} />
      <Animated.View
        style={[
          styles.checkFill,
          {
            opacity: fill,
            transform: [
              {
                scale: fill.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.6, 1],
                }),
              },
            ],
          },
        ]}
      >
        <Ionicons name='checkmark' size={16} color={Liquid.lime} />
      </Animated.View>
    </View>
  );

  return (
    <TouchableOpacity
      style={[styles.card, packed ? styles.cardDone : styles.cardPaper]}
      onPress={handlePress}
      activeOpacity={LiquidMotion.pressOpacity}
      accessibilityRole='checkbox'
      accessibilityState={{ checked: packed }}
      accessibilityLabel={`${gear.getDisplayName()}, ${weightLabel}`}
    >
      <LiquidMetricRow
        size='sm'
        brand={gear.getDisplayCompany()}
        name={gear.getDisplayName()}
        value={weight}
        // 챙긴 행은 정체·무게를 함께 낮춘다(핸드오프 doneOpacity). 체크 원은 상태를
        // 말하는 표식이라 낮추지 않는다.
        dim={packed}
        // 정체가 두 줄인 행과 세 줄인 행의 키를 같게 묶는다(PK-2 → WH-1 행 높이 계약).
        minContentHeight={LiquidLayout.rowMinContent}
        trailing={renderCheck()}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: LiquidRadius.tile,
  },
  cardPaper: {
    backgroundColor: Liquid.surface,
    boxShadow: LiquidShadow.tile,
  },
  // 챙긴 카드는 그림자를 걷는다 — 면이 가라앉으면서 지면과 같은 층으로 내려간다.
  cardDone: {
    backgroundColor: Liquid.surfaceDone,
  },
  checkSlot: {
    width: CHECK_SIZE,
    height: CHECK_SIZE,
  },
  // 빈 상태의 테두리 원. 채움 원이 같은 자리를 통째로 덮으므로 테두리가 남지 않는다.
  checkOutline: {
    position: 'absolute',
    width: CHECK_SIZE,
    height: CHECK_SIZE,
    borderRadius: CHECK_SIZE / 2,
    borderWidth: 1.5,
    borderColor: Liquid.inkFaint,
  },
  checkFill: {
    position: 'absolute',
    width: CHECK_SIZE,
    height: CHECK_SIZE,
    borderRadius: CHECK_SIZE / 2,
    backgroundColor: Liquid.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default observer(BagPackingGearRowView);
