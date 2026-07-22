import { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import PretendardText from '@/components/PretendardText';
import { Color, Spacing } from '@/constants/DesignTokens';
import { BagActivityWorkoutDetail } from '@/model/bag/BagActivityWorkoutDetail';
import {
  formatDistance,
  formatDuration,
  formatElevation,
  formatEnergy,
  formatHeartRate,
  formatPace,
  formatWorkoutStartedAt,
  getWorkoutTypeLabel,
} from '@/model/health/HealthFormat';
import BagActivityChartView from './BagActivityChartView';

interface Props {
  detail: BagActivityWorkoutDetail;
}

/** 데이터 시각화 색 — 토큰 예외로 하드코딩한다(CLAUDE.md). */
const HEART_RATE_COLOR = '#FF4D4F';
const PACE_COLOR = '#2F6BFF';

// 연결된 운동 한 건의 개별 값 + 추이 그래프(HA-4).
//
// 그래프를 운동별로 두는 이유: 1박 2일이 날짜별로 나뉘어 기록되면 시간축을 합쳤을 때
// 사이의 빈 구간(잠자는 시간)이 그래프 대부분을 차지해 추이를 읽을 수 없다.
const BagActivityWorkoutDetailView: FC<Props> = ({ detail }) => {
  const { workout, heartRateSeries, paceSeries } = detail;
  const metrics = [
    workout.distanceMeters !== undefined
      ? formatDistance(workout.distanceMeters)
      : null,
    formatDuration(workout.durationSeconds),
    workout.elevationAscendedMeters !== undefined
      ? formatElevation(workout.elevationAscendedMeters)
      : null,
    workout.activeEnergyKilocalories !== undefined
      ? formatEnergy(workout.activeEnergyKilocalories)
      : null,
  ]
    .filter(part => part !== null)
    .join(' · ');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <PretendardText style={styles.title} weight='semibold'>
          {getWorkoutTypeLabel(workout.type)}
        </PretendardText>
        <PretendardText style={styles.subtitle}>
          {formatWorkoutStartedAt(workout.startDate)} · {metrics}
        </PretendardText>
      </View>
      {/* 데이터가 없는 항목은 그래프를 통째로 생략한다(HA-4). */}
      <BagActivityChartView
        title='심박수'
        points={heartRateSeries}
        color={HEART_RATE_COLOR}
        formatValue={formatHeartRate}
      />
      <BagActivityChartView
        title='페이스'
        hint='값이 작을수록 빠름'
        points={paceSeries}
        color={PACE_COLOR}
        formatValue={formatPace}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: Spacing.item,
  },
  header: {
    gap: 4,
  },
  title: {
    fontSize: 16,
    color: Color.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: Color.textSecondary,
  },
});

export default BagActivityWorkoutDetailView;
