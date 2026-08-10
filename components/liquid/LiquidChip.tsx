import { FC } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import PretendardText from '@/components/PretendardText';
import { Liquid, LiquidMotion } from '@/constants/DesignTokens';

interface Props {
  label: string;
  /** 선택 상태 — 잉크 채움 + 흰 글자 */
  selected?: boolean;
  /** 'sm'은 2차(세분) 필터용 */
  size?: 'md' | 'sm';
  /** 라벨 앞 색 도트 — 지도 마커 색 범례를 겸할 때 */
  dotColor?: string;
  onPress?: () => void;
}

/**
 * 칩은 h34(2차 28)로 그리는데 HIG 최소 터치 타깃은 44다. 시각 높이를 키우면 칩 줄이 두꺼워져
 * 위계가 흔들리므로 세로 여유로만 확보한다 — 크기별로 44를 채우는 값이 다르다:
 * (44 − 34) / 2 = 5 → 6, (44 − 28) / 2 = 8.
 * 가로는 0 — 가로 스크롤에서 이웃 칩과 겹친다.
 */
const CHIP_HIT_SLOP = {
  md: { top: 6, bottom: 6, left: 0, right: 0 },
  sm: { top: 8, bottom: 8, left: 0, right: 0 },
} as const;

/**
 * Liquid Depth 필터·카테고리 칩(핸드오프 Chip). 완전한 알약이며 선택 시 잉크 채움.
 * 고정 높이 대신 minHeight — Dynamic Type으로 글자가 커져도 잘리지 않는다.
 */
const LiquidChip: FC<Props> = ({
  label,
  selected = false,
  size = 'md',
  dotColor,
  onPress,
}) => {
  const height = size === 'sm' ? 28 : 34;

  return (
    <TouchableOpacity
      style={[
        styles.chip,
        { minHeight: height, borderRadius: height / 2 },
        selected ? styles.chipSelected : styles.chipIdle,
      ]}
      onPress={onPress}
      activeOpacity={LiquidMotion.pressOpacity}
      hitSlop={CHIP_HIT_SLOP[size]}
      accessibilityRole='button'
      accessibilityState={{ selected }}
      accessibilityLabel={label}
    >
      {dotColor ? (
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
      ) : null}
      <PretendardText
        weight={selected ? 'semibold' : 'medium'}
        style={[
          styles.label,
          selected ? styles.labelSelected : styles.labelIdle,
        ]}
        numberOfLines={1}
      >
        {label}
      </PretendardText>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
    gap: 6,
  },
  chipIdle: {
    backgroundColor: Liquid.chipFill,
    borderWidth: 0.5,
    borderColor: Liquid.chipStroke,
  },
  chipSelected: {
    backgroundColor: Liquid.ink,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 13.5,
  },
  labelIdle: {
    color: Liquid.inkSecondary,
  },
  labelSelected: {
    color: Liquid.surface,
  },
});

export default LiquidChip;
