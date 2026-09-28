import { useEffect, useState } from 'react';
import { Animated } from 'react-native';

/**
 * 로딩 골격의 숨쉬는 투명도. 스켈레톤 화면들이 함께 쓰는 단일 소스다.
 *
 * 값(0.3↔0.7 · 800ms)은 화면마다 같아야 한다 — 탭을 옮길 때마다 골격의 호흡이 달라지면
 * 같은 로딩인데 다른 화면처럼 읽힌다.
 */
const BREATHING_MIN_OPACITY = 0.3;
const BREATHING_MAX_OPACITY = 0.7;
const BREATHING_DURATION = 800;

const useBreathingOpacity = () => {
  // `useRef(...).current`를 렌더 중 읽으면 react-hooks 규칙에 걸린다 — 초기화 함수로 1회만 만든다.
  const [opacity] = useState(() => new Animated.Value(BREATHING_MIN_OPACITY));

  useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: BREATHING_MAX_OPACITY,
          duration: BREATHING_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: BREATHING_MIN_OPACITY,
          duration: BREATHING_DURATION,
          useNativeDriver: true,
        }),
      ]).start(() => animate());
    };

    animate();
  }, [opacity]);

  return opacity;
};

export default useBreathingOpacity;
