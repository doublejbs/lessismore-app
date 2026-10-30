import { FC, useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import useReduceMotion from '@/hooks/useReduceMotion';

const DOT_SIZE = 6;
const DOT_COUNT = 3;
const STEP_MS = 320;

/**
 * 응답 대기(AS-3·AS-8) — 도우미 말풍선 자리에 점 세 개 + 상태 줄. 앱 v1은 비스트리밍이라
 * 상태 줄은 `계획을 세우는 중…` 하나다. 동작 줄이기를 켜면 점을 움직이지 않는다.
 */
const AssistantStatusLineView: FC = () => {
  const reduceMotion = useReduceMotion();
  const [values] = useState(() =>
    Array.from({ length: DOT_COUNT }, () => new Animated.Value(0.3))
  );

  useEffect(() => {
    if (reduceMotion !== false) {
      return;
    }

    const animation = Animated.loop(
      Animated.stagger(
        STEP_MS / 2,
        values.map(value =>
          Animated.sequence([
            Animated.timing(value, {
              toValue: 1,
              duration: STEP_MS,
              useNativeDriver: true,
            }),
            Animated.timing(value, {
              toValue: 0.3,
              duration: STEP_MS,
              useNativeDriver: true,
            }),
          ])
        )
      )
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [reduceMotion, values]);

  const label = app.getL10n().t('assistant.status.thinking');

  return (
    <View
      style={styles.container}
      accessible
      accessibilityLabel={label}
      accessibilityLiveRegion='polite'
    >
      <View style={styles.dots}>
        {values.map((value, index) => (
          <Animated.View key={index} style={[styles.dot, { opacity: value }]} />
        ))}
      </View>
      <PretendardText style={styles.label}>{label}</PretendardText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  dots: {
    flexDirection: 'row',
    gap: 4,
    paddingVertical: 6,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: Acg.ink,
  },
  label: {
    ...AcgType.meta,
    color: Acg.textMuted,
  },
});

export default AssistantStatusLineView;
