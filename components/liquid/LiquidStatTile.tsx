import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import PretendardText from '@/components/PretendardText';
import {
  Liquid,
  LiquidFont,
  LiquidRadius,
  LiquidShadow,
} from '@/constants/DesignTokens';

interface Props {
  value: string | number;
  label: string;
  /** 강조할 지표 하나에만 'accent' */
  tone?: 'paper' | 'accent';
  /**
   * 값을 라벨 수준까지 낮춘다 — 0회처럼 셀 것이 없는 지표(목업 §9의 둘째 타일).
   * 흰 면은 라벨보다 한 단계 옅은 `inkMuted`, 라임 면은 라벨과 같은 `limeOnQuiet`가 된다.
   * 면은 그대로 두고 숫자만 물러나므로 타일 줄의 리듬이 깨지지 않는다.
   */
  dim?: boolean;
}

/**
 * Liquid Depth 지표 타일(핸드오프 StatTile). 숫자 하나 + 라벨 하나.
 * 2~3개를 가로로 나란히 둘 때 부모가 flexDirection row + gap을 잡는다.
 */
const LiquidStatTile: FC<Props> = ({
  value,
  label,
  tone = 'paper',
  dim = false,
}) => {
  const isAccent = tone === 'accent';

  return (
    <View
      style={[styles.tile, isAccent ? styles.tileAccent : styles.tilePaper]}
    >
      <PretendardText
        style={[
          styles.value,
          dim && (isAccent ? styles.valueDimAccent : styles.valueDim),
        ]}
        numberOfLines={1}
      >
        {String(value)}
      </PretendardText>
      <PretendardText
        weight='semibold'
        style={[styles.label, isAccent && styles.labelAccent]}
        numberOfLines={1}
      >
        {label}
      </PretendardText>
    </View>
  );
};

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    borderRadius: LiquidRadius.tile,
    padding: 16,
    gap: 6,
  },
  tilePaper: {
    backgroundColor: Liquid.surface,
    boxShadow: LiquidShadow.tile,
  },
  tileAccent: {
    backgroundColor: Liquid.lime,
    boxShadow: LiquidShadow.accent,
  },
  value: {
    fontFamily: LiquidFont.condensed,
    fontSize: 34,
    lineHeight: 34,
    color: Liquid.ink,
  },
  // 흰 면 위 낮춘 숫자 — 라벨(inkSecondary)보다 한 단계 더 물러난다.
  valueDim: {
    color: Liquid.inkMuted,
  },
  // 라임 면 위에서는 잉크 계열로 내리면 대비가 오히려 세진다 — 라벨과 같은 색으로 합친다.
  valueDimAccent: {
    color: Liquid.limeOnQuiet,
  },
  /**
   * 라벨은 `inkSecondary` + 600이다 — 목업의 `inkMuted`/500은 12.5px에서 흰 면 대비 AA(4.5:1)에
   * 못 미쳐 한 단계 올렸다(HIG 대비). 값(`dim`일 때 `inkMuted`)이 라벨보다 옅어지는 순서는
   * 그대로 유지된다.
   */
  label: {
    fontSize: 12.5,
    color: Liquid.inkSecondary,
  },
  labelAccent: {
    color: Liquid.limeOnQuiet,
  },
});

export default LiquidStatTile;
