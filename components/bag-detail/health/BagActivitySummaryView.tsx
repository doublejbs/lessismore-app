import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import { StyleSheet, View } from 'react-native';
import PretendardText from '@/components/PretendardText';
import {
  Acg,
  AcgRadius,
  AcgType,
  Spacing,
} from '@/constants/DesignTokens';
import AcgDisplayText from '@/components/acg/AcgDisplayText';
import { BagActivitySummary } from '@/model/bag/BagActivitySummary';
import app from '@/model/app/App';
import { HealthWorkout } from '@/model/health/HealthTypes';
import {
  formatBagWeight,
  formatDistance,
  formatDuration,
  formatElevation,
  formatEnergy,
  formatWorkoutStartedAt,
  getWorkoutTypeLabel,
} from '@/model/health/HealthFormat';

interface Props {
  summary: BagActivitySummary;
  /** 배낭 총 무게(g). 0이면 무게를 아직 채우지 않은 배낭이라 문구에서 뺀다. */
  weightGrams: number;
  /** 단건 상세일 때 헤드라인과 요약 지표 카드 사이에 먼저 보여줄 운동. */
  singleWorkout?: HealthWorkout;
}

/** 소스에 값이 없는 지표. 0으로 보이면 "0m 올랐다"로 읽혀 오해를 준다. */
// 연결된 운동의 합산 요약(HA-4). 값은 Firestore에 저장된 스냅샷(DM-22)이라
// 기기 조회가 실패해도 항상 그릴 수 있다(HA-5).
const BagActivitySummaryView: FC<Props> = ({
  summary,
  weightGrams,
  singleWorkout,
}) => {
  const metrics = [
    {
      label: app.getL10n().t('health.summaryDistance'),
      value: formatDistance(summary.distance),
    },
    {
      label: app.getL10n().t('health.summaryDuration'),
      value: formatDuration(summary.duration),
    },
    {
      label: app.getL10n().t('health.summaryElevation'),
      value:
        summary.elevationGain !== undefined
          ? formatElevation(summary.elevationGain)
          : app.getL10n().t('health.noRecord'),
    },
    {
      label: app.getL10n().t('health.summaryEnergy'),
      value:
        summary.activeEnergy !== undefined
          ? formatEnergy(summary.activeEnergy)
          : app.getL10n().t('health.noRecord'),
    },
  ];

  return (
    <View style={styles.container}>
      {/* 이 기능의 핵심 서사 — 무게와 이동을 한 문장으로 잇는다(HA-4). */}
      {weightGrams > 0 && (
          <PretendardText style={styles.headline} weight='bold'>
            {app.getL10n().t('health.carryingDistance', {
              weight: formatBagWeight(weightGrams),
              distance: formatDistance(summary.distance),
            })}
        </PretendardText>
      )}
      {singleWorkout !== undefined && (
        <View style={styles.workoutIdentity}>
          <PretendardText style={styles.workoutTitle} weight='medium'>
            {getWorkoutTypeLabel(singleWorkout.type)}
          </PretendardText>
          <PretendardText style={styles.workoutStartedAt}>
            {formatWorkoutStartedAt(singleWorkout.startDate)}
          </PretendardText>
        </View>
      )}
      <View style={styles.grid}>
        {metrics.map(metric => (
          <View key={metric.label} style={styles.metric}>
            <PretendardText style={styles.metricLabel}>
              {metric.label}
            </PretendardText>
            {/* 숫자라 콘덴스드를 쓴다 — 이 화면은 수치가 전부다(ACG). `기록 없음`은
                한글이라 콘덴스드에 글리프가 없어 본문 서체로 떨어뜨린다. */}
            {metric.value === app.getL10n().t('health.noRecord') ? (
              <PretendardText style={styles.metricEmpty}>
                {metric.value}
              </PretendardText>
            ) : (
              <AcgDisplayText style={styles.metricValue}>
                {metric.value}
              </AcgDisplayText>
            )}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: Spacing.item,
  },
  headline: {
    ...AcgType.screenTitle,
    color: Acg.ink,
  },
  headlineValue: {
    color: Acg.ink,
  },
  workoutIdentity: {
    gap: 4,
  },
  workoutTitle: {
    ...AcgType.rowTitle,
    color: Acg.ink,
  },
  workoutStartedAt: {
    ...AcgType.meta,
    color: Acg.textMuted,
  },
  // 이 화면의 주 정보라 종이 면으로 띄운다 — 회색 면은 지면과 톤이 가까워 안 떠 보였다
  // (2026-08-05 디자인 리뷰).
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 14,
    backgroundColor: Acg.controlFill,
    borderRadius: AcgRadius.thumb,
  },
  metric: {
    // 2열 그리드.
    width: '50%',
    gap: 4,
    paddingVertical: 8,
  },
  metricLabel: {
    ...AcgType.meta,
    color: Acg.textMuted,
  },
  metricValue: {
    ...AcgType.displaySmall,
    color: Acg.ink,
  },
  metricEmpty: {
    ...AcgType.sectionSubtitle,
    // 콘덴스드 수치(`metricValue`)와 같은 자리에 번갈아 놓이는 한글 값이라
    // 줄박스를 맞춰야 그리드 행이 어긋나지 않는다.
    lineHeight: AcgType.displaySmall.lineHeight,
    color: Acg.textMuted,
  },
});

export default observer(BagActivitySummaryView);
