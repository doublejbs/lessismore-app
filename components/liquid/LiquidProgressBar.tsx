import { FC, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Liquid, LiquidMotion } from '@/constants/DesignTokens';

interface Props {
  percent: number;
  /** 라임 면 위에서는 'ink', 흰 면 위에서는 'accent' */
  tone?: 'ink' | 'accent';
  height?: number;
  /**
   * 트랙 색 재정의 — 라임 면 위, 그리고 카드 **안에 든** 유리 판 위에서는
   * rgba(16,16,18,.14)를 쓴다(홈 히어로).
   * 예외: 지면 위에 직접 뜬 유리 카드는 기본 `surfaceSunken` 트랙을 쓴다(목업 §7 패킹 진행) —
   * 반투명 트랙이면 그 아래 지형이 비쳐 채움과의 경계가 흐려진다.
   */
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
  // 생성 시점 값이 현재 진행률 — 재마운트되어도 0에서 자라 올라오지 않는다.
  const [progress] = useState(() => new Animated.Value(clamped));
  const animatedPercent = useRef(clamped);

  useEffect(() => {
    // 마운트 직후와 무관한 리렌더에서는 이미 목표에 있다 — 스프링을 새로 쏘지 않는다.
    if (animatedPercent.current === clamped) {
      return;
    }

    animatedPercent.current = clamped;

    const animation = Animated.spring(progress, {
      toValue: clamped,
      ...LiquidMotion.spring,
      useNativeDriver: false, // width 보간이라 네이티브 드라이버 불가
    });

    animation.start();

    // 값이 연달아 바뀌거나 바가 사라질 때 진행 중인 스프링을 남기지 않는다.
    return () => {
      animation.stop();
    };
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
