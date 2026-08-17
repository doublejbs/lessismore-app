import { AccessibilityInfo } from 'react-native';
import { useEffect, useState } from 'react';

const useReduceMotion = (): boolean | null => {
  const [isReduceMotionEnabled, setIsReduceMotionEnabled] = useState<boolean | null>(
    null
  );

  useEffect(() => {
    let isMounted = true;

    void AccessibilityInfo.isReduceMotionEnabled()
      .then(enabled => {
        if (isMounted) {
          setIsReduceMotionEnabled(enabled);
        }
      })
      .catch(() => undefined);

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setIsReduceMotionEnabled
    );

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  return isReduceMotionEnabled;
};

export default useReduceMotion;
