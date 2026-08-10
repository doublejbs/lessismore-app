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
}

/**
 * Liquid Depth 지표 타일(핸드오프 StatTile). 숫자 하나 + 라벨 하나.
 * 2~3개를 가로로 나란히 둘 때 부모가 flexDirection row + gap을 잡는다.
 */
const LiquidStatTile: FC<Props> = ({ value, label, tone = 'paper' }) => {
  const isAccent = tone === 'accent';

  return (
    <View style={[styles.tile, isAccent ? styles.tileAccent : styles.tilePaper]}>
      <PretendardText style={styles.value} numberOfLines={1}>
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
  label: {
    fontSize: 12.5,
    color: Liquid.inkSecondary,
  },
  labelAccent: {
    color: Liquid.limeOnQuiet,
  },
});

export default LiquidStatTile;
