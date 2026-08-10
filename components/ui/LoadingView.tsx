import { useEffect, useState } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Liquid } from '@/constants/DesignTokens';

interface Props {
  duration?: number;
  // 어두운 면 위에 얹을 때 밝은 색으로 넘긴다(기본은 밝은 면 기준 잉크).
  color?: string;
}

/**
 * 회전 스피너.
 *
 * **스켈레톤을 그릴 수 있는 자리에는 쓰지 않는다**(핸드오프 로딩 규칙: 목록·화면 골격은 셔머).
 * 도착할 모양을 미리 알 수 없는 자리 — 버튼 안 진행 표시, 이미지 한 칸, 시트 첫 로드 — 만
 * 이 스피너를 쓴다.
 */
const LoadingView = ({ duration = 2000, color = Liquid.ink }: Props) => {
  // `useRef(...).current`를 렌더 중 읽으면 react-hooks 룰에 걸린다 — 초기화 함수로 1회만 만든다.
  const [rotateValue] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const rotateAnimation = Animated.loop(
      Animated.timing(rotateValue, {
        toValue: 1,
        duration: duration,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    rotateAnimation.start();

    return () => {
      rotateAnimation.stop();
    };
  }, [duration, rotateValue]);

  const rotate = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.svgContainer, { transform: [{ rotate }] }]}>
        <Svg width='24' height='24' viewBox='0 0 24 24'>
          {/* 열린 원(대시 42 + 간격 150)이 돌아 진행을 낸다 — 채운 원은 정지해 보인다. */}
          <Circle
            cx='12'
            cy='12'
            r='9.5'
            fill='none'
            stroke={color}
            strokeWidth='3'
            strokeLinecap='round'
            strokeDasharray='42 150'
            strokeDashoffset='-16'
          />
        </Svg>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  svgContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default LoadingView;
