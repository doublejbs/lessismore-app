import { FC } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
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
      <Ionicons
        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
        size={24}
        color={selected ? Acg.ink : Acg.hairline}
      />
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
