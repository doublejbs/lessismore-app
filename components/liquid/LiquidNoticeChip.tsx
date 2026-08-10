import { ComponentProps, FC } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { Liquid, LiquidMotion } from '@/constants/DesignTokens';

interface Props {
  label: string;
  /** 라벨 앞 아이콘 — 알림 성격을 아이콘으로 먼저 말한다 */
  icon?: ComponentProps<typeof Ionicons>['name'];
  /** 켜짐 — 잉크 채움 + 라임 글리프 */
  selected?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
}

/**
 * 시각 높이 30(목업 §8) — 카테고리 칩(34)보다 낮다. 별개 축의 보조 칩이라 카테고리 줄보다
 * 두꺼워지면 위계가 뒤집힌다. HIG 44는 세로 여유로만 채운다: (44 − 30) / 2 = 7.
 * 가로는 0 — 이웃 요소와 겹친다.
 */
const CHIP_HEIGHT = 30;
const CHIP_HIT_SLOP = { top: 7, bottom: 7, left: 0, right: 0 };

/**
 * Liquid Depth 라임 톤 알림 칩(목업 §8 창고의 `안 쓴 장비 7`).
 *
 * 액센트 **면**이 아니라 라임 틴트라, 화면의 라임 면 하나 규칙과 자리를 다투지 않는다.
 * 켜면 다른 필터 칩과 같은 잉크 채움으로 바뀌고 글리프만 라임으로 남는다 — 틴트를
 * 더 진하게 하는 방식은 켠 건지 아닌지 한눈에 갈리지 않았다(2026-08-05 선례).
 */
const LiquidNoticeChip: FC<Props> = ({
  label,
  icon,
  selected = false,
  onPress,
  accessibilityLabel,
}) => (
  <TouchableOpacity
    style={[styles.chip, selected ? styles.chipSelected : styles.chipIdle]}
    onPress={onPress}
    activeOpacity={LiquidMotion.pressOpacity}
    hitSlop={CHIP_HIT_SLOP}
    accessibilityRole='button'
    accessibilityState={{ selected }}
    accessibilityLabel={accessibilityLabel ?? label}
  >
    {icon ? (
      <Ionicons
        name={icon}
        size={14}
        color={selected ? Liquid.lime : Liquid.limeOnQuiet}
      />
    ) : null}
    <PretendardText
      weight='semibold'
      style={[styles.label, selected ? styles.labelSelected : styles.labelIdle]}
      numberOfLines={1}
    >
      {label}
    </PretendardText>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  // 고정 높이 대신 minHeight — Dynamic Type으로 글자가 커져도 잘리지 않는다.
  chip: {
    minHeight: CHIP_HEIGHT,
    borderRadius: CHIP_HEIGHT / 2,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    alignSelf: 'flex-start',
  },
  chipIdle: {
    backgroundColor: Liquid.limeTint,
    borderWidth: 0.5,
    borderColor: Liquid.limeTintStroke,
  },
  chipSelected: {
    backgroundColor: Liquid.ink,
  },
  label: {
    fontSize: 12.5,
  },
  /**
   * 라임 계열 글자를 쓴다(라임 원색을 글자색으로 직접 쓰지 않는다). 다만 밝은 면용
   * `limeInk`는 이 **틴트 면 위**에서 4.16:1이라 12.5px에 필요한 AA 4.5에 못 미친다 —
   * 목업은 limeInk지만 한 단계 어두운 `limeOnQuiet`로 조정해 여유를 둔다(아이콘도 함께).
   */
  labelIdle: {
    color: Liquid.limeOnQuiet,
  },
  labelSelected: {
    color: Liquid.surface,
  },
});

export default LiquidNoticeChip;
