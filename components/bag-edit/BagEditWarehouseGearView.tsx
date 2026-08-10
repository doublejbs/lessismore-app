import { FC, useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import Gear from '@/model/gear/Gear';
import BagEdit from '@/model/bag-edit/BagEdit';
import app from '@/model/app/App';
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
  bagEdit: BagEdit;
}

// 체크 원 지름 — 패킹 행(목업 §7)과 같은 값이다. 26은 시각 크기이고 터치 타깃은 행 전체다.
const CHECK_SIZE = 26;

/**
 * 배낭 편집 창고 행 (Liquid Depth, 목업 §7 체크 행 문법).
 *
 * 패킹·사용 기록과 같은 원형 체크를 쓰되 **행을 낮추지 않는다** — 편집은 창고 전체를 훑는
 * 맥락이라 담지 않은 장비도 똑같이 읽혀야 한다(담긴 것만 진해지면 후보를 못 고른다).
 * 그래서 모든 행이 흰 종이 면으로 떠 있고, 담김 여부는 체크 원 하나가 말한다.
 */
const BagEditWarehouseGearView: FC<Props> = ({ gear, bagEdit }) => {
  const isSelected = bagEdit.hasGear(gear);
  // 생성 시점 값이 현재 상태 — 재마운트되어도 애니메이션 없이 맞는 그림에서 시작한다.
  const [fill] = useState(() => new Animated.Value(isSelected ? 1 : 0));
  const animatedSelected = useRef(isSelected);

  useEffect(() => {
    // 마운트 직후와 무관한 리렌더에서는 이미 목표에 있다 — 스프링을 새로 쏘지 않는다.
    if (animatedSelected.current === isSelected) {
      return;
    }

    animatedSelected.current = isSelected;

    const animation = Animated.spring(fill, {
      toValue: isSelected ? 1 : 0,
      ...LiquidMotion.spring,
      useNativeDriver: true,
    });

    animation.start();

    // 토글이 연달아 들어오거나 행이 사라질 때 진행 중인 스프링을 남기지 않는다.
    return () => {
      animation.stop();
    };
  }, [isSelected, fill]);

  const handlePress = () => {
    app.getAnalyticsManager()?.logClick('gear_toggle', { added: !isSelected });
    bagEdit.toggleGear(gear);
  };

  // 색상·사용률을 한 줄로 잇는다(창고 목록과 같은 메타 규칙) — 값이 없는 조각은 빼서
  // ` · `가 홀로 남지 않게 한다.
  const meta = [
    gear.getDisplayColor(),
    gear.hasUsedRate() ? `사용률 ${gear.getUsedRate()}%` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const weight = gear.getWeight();

  // 빈 원은 항상 보인다 — 담기 전에도 이 행이 고를 수 있는 항목임을 드러낸다.
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
      style={styles.card}
      onPress={handlePress}
      activeOpacity={LiquidMotion.pressOpacity}
      accessibilityRole='checkbox'
      accessibilityState={{ checked: isSelected }}
      accessibilityLabel={`${gear.getDisplayName()} 배낭에 ${
        isSelected ? '빼기' : '담기'
      }`}
    >
      <LiquidMetricRow
        size='sm'
        name={gear.getDisplayName()}
        // 썸네일이 붙은 행과 없는 행의 키를 같게 묶는다(BD-1 → WH-1 행 높이 계약).
        minContentHeight={GEAR_THUMBNAIL_SIZE}
        leading={<GearThumbnailView imageUrl={gear.getImageUrl()} />}
        trailing={renderCheck()}
        {...(gear.getDisplayCompany()
          ? { brand: gear.getDisplayCompany() }
          : {})}
        {...(meta ? { meta } : {})}
        {...(weight ? { value: weight } : {})}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: LiquidRadius.tile,
    backgroundColor: Liquid.surface,
    boxShadow: LiquidShadow.tile,
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

export default observer(BagEditWarehouseGearView);
