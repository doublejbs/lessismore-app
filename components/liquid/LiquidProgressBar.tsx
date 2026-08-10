import { FC, useEffect, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Liquid, LiquidMotion } from '@/constants/DesignTokens';

interface Props {
  percent: number;
  /** 라임 면 위에서는 'ink', 흰 면 위에서는 'accent' */
  tone?: 'ink' | 'accent';
  height?: number;
  /** 트랙 색 재정의 — 유리·라임 면 위에서는 rgba(16,16,18,.14)를 쓴다 */
  trackColor?: string;
}

/**
 * Liquid Depth 진행률 바(핸드오프 ProgressBar).
 *
 * 스프링에 `overshootClamping`을 건다 — 진행 바가 목표를 지나쳤다 돌아오면
 * 값이 틀린 것처럼 보인다(핸드오프 Interactions).
 */
const LiquidProgressBar: FC<Props> = ({
  percent,
  tone = 'accent',
  height = 6,
  trackColor,
}) => {
  const clamped = Math.max(0, Math.min(100, percent));
  const [progress] = useState(() => new Animated.Value(clamped));

  useEffect(() => {
    Animated.spring(progress, {
      toValue: clamped,
      ...LiquidMotion.spring,
      useNativeDriver: false, // width 보간이라 네이티브 드라이버 불가
    }).start();
  }, [clamped, progress]);

  return (
    <View
      style={[
        styles.track,
        {
          height,
          borderRadius: height / 2,
          backgroundColor: trackColor ?? Liquid.surfaceSunken,
        },
      ]}
      accessibilityRole='progressbar'
      accessibilityValue={{ min: 0, max: 100, now: clamped }}
    >
      <Animated.View
        style={[
          styles.fill,
          {
            borderRadius: height / 2,
            backgroundColor: tone === 'ink' ? Liquid.ink : Liquid.lime,
            width: progress.interpolate({
              inputRange: [0, 100],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});

export default LiquidProgressBar;
