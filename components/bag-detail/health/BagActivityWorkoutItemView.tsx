import { FC } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import {
  Liquid,
  LiquidLayout,
  LiquidMotion,
  LiquidRadius,
  LiquidShadow,
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
  onToggle: (workoutId: string) => void;
}

/** 체크 원 지름. 패킹 모드의 체크 원과 같은 값으로 둔다(핸드오프 §7). */
const CHECK_SIZE = 26;
const CHECK_ICON_SIZE = 16;

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
      activeOpacity={LiquidMotion.pressOpacity}
      accessibilityRole='checkbox'
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${getWorkoutTypeLabel(workout.type)} ${formatWorkoutStartedAt(workout.startDate)} ${metrics}`}
    >
      <View style={styles.main}>
        <PretendardText style={styles.title} weight='semibold'>
          {getWorkoutTypeLabel(workout.type)}
        </PretendardText>
        {/* 날짜·지표가 한글과 섞인 한 줄이라 본문 서체를 쓴다(콘덴스드에 한글 글리프 없음). */}
        <PretendardText style={styles.subtitle}>
          {formatWorkoutStartedAt(workout.startDate)} · {metrics}
        </PretendardText>
      </View>
      {/* 선택 = 잉크 원 + 라임 체크, 비선택 = 빈 원(핸드오프 패킹 항목). 단일 Ionicons
          글리프로는 잉크 원 위 라임 체크를 낼 수 없어 면과 아이콘을 나눠 쌓는다. */}
      <View style={[styles.check, selected && styles.checkSelected]}>
        {selected && (
          <Ionicons
            name='checkmark'
            size={CHECK_ICON_SIZE}
            color={Liquid.lime}
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    // 고정 높이 대신 최소 높이로 Dynamic Type에 대응한다(44pt 터치 타깃 확보).
    minHeight: 64,
    paddingHorizontal: LiquidLayout.cardPad,
    paddingVertical: 14,
    borderRadius: LiquidRadius.tile,
    backgroundColor: Liquid.surface,
    boxShadow: LiquidShadow.tile,
    // 선택 시 테두리 색만 바꿔 레이아웃이 밀리지 않게, 비선택도 같은 두께를 들고 있는다.
    borderWidth: 1.5,
    borderColor: Liquid.hairline,
  },
  itemSelected: {
    borderColor: Liquid.ink,
  },
  main: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 15,
    lineHeight: 20,
    color: Liquid.ink,
  },
  subtitle: {
    fontSize: 12.5,
    lineHeight: 17,
    color: Liquid.inkTertiary,
  },
  check: {
    width: CHECK_SIZE,
    height: CHECK_SIZE,
    borderRadius: CHECK_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Liquid.inkFaint,
  },
  checkSelected: {
    borderColor: Liquid.ink,
    backgroundColor: Liquid.ink,
  },
});

export default BagActivityWorkoutItemView;
