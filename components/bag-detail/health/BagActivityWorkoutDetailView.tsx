import { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import PretendardText from '@/components/PretendardText';
import { Liquid, LiquidViz } from '@/constants/DesignTokens';
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
  /**
   * 이 운동 하나가 곧 전체 요약인지. 운동이 하나뿐이면 위 요약 카드가 이미 같은 네 값을
   * 보여주므로 메타 줄에서 값을 빼고 시각만 남긴다 — 화면에 같은 숫자가 세 번 나왔다
   * (2026-08-05 디자인 리뷰).
   */
  isOnly: boolean;
  detail: BagActivityWorkoutDetail;
}

/**
 * 그래프 선 색. 데이터 시각화는 액센트 체계 밖이라 시각화 전용 팔레트(`LiquidViz`)에서
 * 가져온다 — 값이 배낭 카테고리 의미색과 겹치지만 뜻은 분리돼 있다. 흰 종이 카드 위에 놓이므로
 * 옛 형광 계열(#FF4D4F·#2F6BFF)보다 차분한 이 값들이 리디자인 톤에 맞는다.
 */
const HEART_RATE_COLOR = LiquidViz.heartRate;
const PACE_COLOR = LiquidViz.pace;

// 연결된 운동 한 건의 개별 값 + 추이 그래프(HA-4).
//
// 그래프를 운동별로 두는 이유: 1박 2일이 날짜별로 나뉘어 기록되면 시간축을 합쳤을 때
// 사이의 빈 구간(잠자는 시간)이 그래프 대부분을 차지해 추이를 읽을 수 없다.
const BagActivityWorkoutDetailView: FC<Props> = ({ detail, isOnly }) => {
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
        {/* 날짜·지표가 한글과 섞인 한 줄이라 본문 서체를 쓴다(콘덴스드에 한글 글리프 없음). */}
        <PretendardText style={styles.subtitle}>
          {isOnly
            ? formatWorkoutStartedAt(workout.startDate)
            : `${formatWorkoutStartedAt(workout.startDate)} · ${metrics}`}
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
    gap: 12,
  },
  header: {
    gap: 4,
  },
  title: {
    fontSize: 17,
    lineHeight: 24,
    color: Liquid.ink,
  },
  subtitle: {
    fontSize: 13.5,
    lineHeight: 19,
    color: Liquid.inkTertiary,
  },
});

export default BagActivityWorkoutDetailView;
