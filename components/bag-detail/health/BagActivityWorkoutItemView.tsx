import { FC, useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import {
  Acg,
  AcgRow,
  AcgType,
  Spacing,
} from '@/constants/DesignTokens';
import { HealthWorkout } from '@/model/health/HealthTypes';
import {
  formatDistance,
  formatDuration,
  formatWorkoutStartedAt,
  getWorkoutTypeLabel,
} from '@/model/health/HealthFormat';
import useReduceMotion from '@/hooks/useReduceMotion';

const CHECK_SPRING_DAMPING = 22;
const UNSELECT_DURATION = 140;

interface Props {
  workout: HealthWorkout;
  selected: boolean;
  first: boolean;
  onToggle: (workoutId: string) => void;
}

// 후보 운동 한 건(HA-3). 종류·시작 시각·거리·소요 시간을 보여주고 탭으로 선택을 토글한다.
const BagActivityWorkoutItemView: FC<Props> = ({
  workout,
  selected,
  first,
  onToggle,
}) => {
  const [selectionProgress] = useState(
    () => new Animated.Value(selected ? 1 : 0)
  );
  const isReduceMotionEnabled = useReduceMotion();

  useEffect(() => {
    if (isReduceMotionEnabled === null) {
      return;
    }

    const targetValue = selected ? 1 : 0;

    selectionProgress.stopAnimation();

    if (isReduceMotionEnabled) {
      selectionProgress.setValue(targetValue);

      return;
    }

    if (selected) {
      // 탭 선택은 제스처가 아니므로 damping 22로 살짝만 튀게 해 과한 바운스를 피한다.
      Animated.spring(selectionProgress, {
        toValue: targetValue,
        stiffness: 300,
        damping: CHECK_SPRING_DAMPING,
        mass: 1,
        useNativeDriver: true,
      }).start();

      return;
    }

    Animated.timing(selectionProgress, {
      toValue: targetValue,
      duration: UNSELECT_DURATION,
      useNativeDriver: true,
    }).start();
  }, [isReduceMotionEnabled, selected, selectionProgress]);

  const handlePress = () => {
    onToggle(workout.id);

    if (!selected) {
      void Haptics.selectionAsync().catch(() => undefined);
    }
  };

  // 실내 운동 등 거리가 없는 기록도 후보로 나올 수 있어 있을 때만 표기한다.
  const metrics = [
    workout.distanceMeters !== undefined
      ? formatDistance(workout.distanceMeters)
      : null,
    formatDuration(workout.durationSeconds),
  ]
    .filter(part => part !== null)
    .join(' · ');

  return (
    <TouchableOpacity
      style={[styles.item, first && styles.firstItem]}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole='checkbox'
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${getWorkoutTypeLabel(workout.type)} ${formatWorkoutStartedAt(workout.startDate)} ${metrics}`}
    >
      <View style={styles.main}>
        <PretendardText style={styles.title} weight='medium'>
          {getWorkoutTypeLabel(workout.type)}
        </PretendardText>
        <PretendardText style={styles.subtitle}>
          {formatWorkoutStartedAt(workout.startDate)} · {metrics}
        </PretendardText>
      </View>
      <View style={styles.iconContainer} pointerEvents='none'>
        <Animated.View
          style={[
            styles.iconLayer,
            {
              opacity: selectionProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0],
              }),
            },
          ]}
        >
          <Ionicons name='ellipse-outline' size={24} color={Acg.hairline} />
        </Animated.View>
        <Animated.View
          style={[
            styles.iconLayer,
            {
              opacity: selectionProgress,
              transform: [
                {
                  scale: selectionProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Ionicons name='checkmark-circle' size={24} color={Acg.ink} />
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.item,
    minHeight: AcgRow.minHeight,
    paddingVertical: AcgRow.paddingVertical,
    borderTopWidth: 1,
    borderTopColor: Acg.hairline,
  },
  firstItem: {
    borderTopWidth: 0,
  },
  main: {
    flex: 1,
    gap: 4,
  },
  iconContainer: {
    width: 24,
    height: 24,
  },
  iconLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  title: {
    ...AcgType.rowTitle,
    color: Acg.ink,
  },
  subtitle: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
});

export default BagActivityWorkoutItemView;
