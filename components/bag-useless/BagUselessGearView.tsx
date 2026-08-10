import { FC, useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import Gear from '@/model/gear/Gear';
import BagUseless from '@/model/bag-useless/BagUseless';
import LiquidMetricRow from '@/components/liquid/LiquidMetricRow';
import GearThumbnailView, {
  GEAR_THUMBNAIL_SIZE,
} from '@/components/gear/GearThumbnailView';
import {
  Liquid,
  LiquidMotion,
  LiquidRadius,
  LiquidShadow,
} from '@/constants/DesignTokens';

interface Props {
  gear: Gear;
  bagUseless: BagUseless;
}

// 체크 원 지름 — 패킹 행(목업 §7)과 같은 값이다. 26은 시각 크기이고 터치 타깃은 행 전체다.
const CHECK_SIZE = 26;

/**
 * BD-5 사용 기록 행 (Liquid Depth, 목업 §7 패킹 행과 같은 문법).
 *
 * 패킹 모드와 **같은 인터랙션 문법**을 쓰되 체크의 뜻만 다르다 — 여기서 체크는 "이 장비를
 * 실제로 썼다"이고, 체크를 풀면 안 쓴 장비로 기록된다. 그래서 가라앉는 쪽이 패킹과
 * 반대다: 쓴 장비가 흰 종이 면으로 떠 있고, 안 쓴 장비가 `surfaceDone`으로 내려앉는다.
 * 두 화면 모두 항목을 목록에서 지우거나 자리를 바꾸지 않는다.
 */
const BagUselessGearView: FC<Props> = ({ gear, bagUseless }) => {
  const selected = bagUseless.isSelected(gear);
  // 생성 시점 값이 현재 상태 — 재마운트되어도 애니메이션 없이 맞는 그림에서 시작한다.
  const [fill] = useState(() => new Animated.Value(selected ? 1 : 0));
  const animatedSelected = useRef(selected);

  useEffect(() => {
    // 마운트 직후와 무관한 리렌더에서는 이미 목표에 있다 — 스프링을 새로 쏘지 않는다.
    if (animatedSelected.current === selected) {
      return;
    }

    animatedSelected.current = selected;

    const animation = Animated.spring(fill, {
      toValue: selected ? 1 : 0,
      ...LiquidMotion.spring,
      useNativeDriver: true,
    });

    animation.start();

    // 토글이 연달아 들어오거나 행이 사라질 때 진행 중인 스프링을 남기지 않는다.
    return () => {
      animation.stop();
    };
  }, [selected, fill]);

  const handlePress = () => {
    bagUseless.toggle(gear);
  };

  // 빈 원은 항상 보인다 — 고르기 전에도 이 행이 고를 수 있는 항목임을 드러낸다.
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
      style={[styles.card, selected ? styles.cardPaper : styles.cardDone]}
      onPress={handlePress}
      activeOpacity={LiquidMotion.pressOpacity}
      accessibilityRole='checkbox'
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${gear.getDisplayName()}, ${gear.getWeight()}g`}
    >
      <LiquidMetricRow
        size='sm'
        brand={gear.getDisplayCompany()}
        name={gear.getDisplayName()}
        value={gear.getWeight()}
        unit='g'
        // 안 쓴 행은 정체·무게를 함께 낮춘다(핸드오프 doneOpacity). 체크 원은 상태를
        // 말하는 표식이라 낮추지 않는다.
        dim={!selected}
        // 썸네일이 붙은 행과 없는 행의 키를 같게 묶는다(BD-1 → WH-1 행 높이 계약).
        minContentHeight={GEAR_THUMBNAIL_SIZE}
        leading={
          <GearThumbnailView
            variant='liquid'
            imageUrl={gear.getImageUrl()}
            style={selected ? undefined : styles.thumbnailDim}
          />
        }
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
  // 안 쓴 카드는 그림자를 걷는다 — 면이 가라앉으면서 지면과 같은 층으로 내려간다.
  cardDone: {
    backgroundColor: Liquid.surfaceDone,
  },
  thumbnailDim: {
    opacity: LiquidMotion.doneOpacity,
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

export default observer(BagUselessGearView);
