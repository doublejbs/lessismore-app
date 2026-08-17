import { useEffect } from 'react';
import { Animated } from 'react-native';
import useReduceMotion from './useReduceMotion';

const SHEET_FADE_DURATION = 220;
const REDUCE_MOTION_FADE_DURATION = 200;

interface Options {
  readonly visible?: boolean;
  readonly fadeAnim?: Animated.Value;
  readonly slideAnim?: Animated.Value;
  readonly slideOffset?: number;
  readonly onCloseComplete?: () => void;
}

interface Result {
  readonly isReduceMotionEnabled: boolean;
}

/**
 * 공용 시트 전환. 일반 상태에서는 오버슈트 없는 스프링을 쓰고,
 * Reduce Motion 상태에서는 위치를 즉시 바꾼 뒤 딤만 짧게 페이드한다.
 * 애니메이션 값을 생략하면 접근성 상태만 구독하는 용도로 쓸 수 있다.
 */
const useSheetTransition = ({
  visible,
  fadeAnim,
  slideAnim,
  slideOffset,
  onCloseComplete,
}: Options = {}): Result => {
  const isReduceMotionEnabled = useReduceMotion();

  useEffect(() => {
    if (
      visible === undefined ||
      fadeAnim === undefined ||
      slideAnim === undefined ||
      slideOffset === undefined ||
      isReduceMotionEnabled === null
    ) {
      return;
    }

    const targetSlide = visible ? 0 : slideOffset;

    if (isReduceMotionEnabled) {
      slideAnim.setValue(targetSlide);

      Animated.timing(fadeAnim, {
        toValue: visible ? 1 : 0,
        duration: REDUCE_MOTION_FADE_DURATION,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && !visible) {
          onCloseComplete?.();
        }
      });

      return;
    }

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: visible ? 1 : 0,
        duration: SHEET_FADE_DURATION,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: targetSlide,
        stiffness: 300,
        damping: 26,
        mass: 1,
        overshootClamping: true,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished && !visible) {
        onCloseComplete?.();
      }
    });
  }, [
    fadeAnim,
    isReduceMotionEnabled,
    onCloseComplete,
    slideAnim,
    slideOffset,
    visible,
  ]);

  return { isReduceMotionEnabled: isReduceMotionEnabled ?? false };
};

export default useSheetTransition;
