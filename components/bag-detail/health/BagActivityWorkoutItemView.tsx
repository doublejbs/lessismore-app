import { FC } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { Color, Radius, Spacing } from '@/constants/DesignTokens';
import { HealthWorkout } from '@/model/health/HealthTypes';
import {
  formatDistance,
  formatDuration,
  formatWorkoutStartedAt,
  getWorkoutTypeLabel,
} from '@/model/health/HealthFormat';

interface Props {
  workout: HealthWorkout;
  selected: boolean;
  onToggle: (workoutId: string) => void;
}

// 후보 운동 한 건(HA-3). 종류·시작 시각·거리·소요 시간을 보여주고 탭으로 선택을 토글한다.
const BagActivityWorkoutItemView: FC<Props> = ({
  workout,
  selected,
  onToggle,
}) => {
  const handlePress = () => {
    onToggle(workout.id);
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
      style={[styles.item, selected && styles.itemSelected]}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole='checkbox'
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${getWorkoutTypeLabel(workout.type)} ${formatWorkoutStartedAt(workout.startDate)} ${metrics}`}
    >
      <View style={styles.main}>
        <PretendardText style={styles.title} weight='semibold'>
          {getWorkoutTypeLabel(workout.type)}
        </PretendardText>
        <PretendardText style={styles.subtitle}>
          {formatWorkoutStartedAt(workout.startDate)} · {metrics}
        </PretendardText>
      </View>
      <Ionicons
        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
        size={24}
        color={selected ? Color.textPrimary : Color.iconMuted}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.item,
    // 고정 높이 대신 최소 높이로 Dynamic Type에 대응한다(44pt 터치 타깃 확보).
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Color.chipBorder,
    backgroundColor: Color.background,
  },
  itemSelected: {
    borderColor: Color.textPrimary,
    backgroundColor: Color.surfaceMuted,
  },
  main: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 15,
    color: Color.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: Color.textSecondary,
  },
});

export default BagActivityWorkoutItemView;
