import { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgFontSize, Spacing } from '@/constants/DesignTokens';
import AcgDisplayText from '@/components/acg/AcgDisplayText';
import { BagActivitySummary } from '@/model/bag/BagActivitySummary';
import {
  formatBagWeight,
  formatDistance,
  formatDuration,
  formatElevation,
  formatEnergy,
} from '@/model/health/HealthFormat';

interface Props {
  summary: BagActivitySummary;
  /** 배낭 총 무게(g). 0이면 무게를 아직 채우지 않은 배낭이라 문구에서 뺀다. */
  weightGrams: number;
}

/** 소스에 값이 없는 지표. 0으로 보이면 "0m 올랐다"로 읽혀 오해를 준다. */
const EMPTY_METRIC = '기록 없음';

// 연결된 운동의 합산 요약(HA-4). 값은 Firestore에 저장된 스냅샷(DM-22)이라
// 기기 조회가 실패해도 항상 그릴 수 있다(HA-5).
const BagActivitySummaryView: FC<Props> = ({ summary, weightGrams }) => {
  const metrics = [
    { label: '총 거리', value: formatDistance(summary.distance) },
    { label: '총 시간', value: formatDuration(summary.duration) },
    {
      label: '누적 상승',
      value:
        summary.elevationGain !== undefined
          ? formatElevation(summary.elevationGain)
          : EMPTY_METRIC,
    },
    {
      label: '소모 칼로리',
      value:
        summary.activeEnergy !== undefined
          ? formatEnergy(summary.activeEnergy)
          : EMPTY_METRIC,
    },
  ];

  return (
    <View style={styles.container}>
      {/* 이 기능의 핵심 서사 — 무게와 이동을 한 문장으로 잇는다(HA-4). */}
      {weightGrams > 0 && (
        <PretendardText style={styles.headline} weight='bold'>
          {/* 두 수치가 이 문장의 결론이라 라임으로 세운다 — 앱의 유일한 액센트(ACG). */}
          <PretendardText style={styles.headlineValue} weight='bold'>
            {formatBagWeight(weightGrams)}
          </PretendardText>
          {' 메고\n'}
          <PretendardText style={styles.headlineValue} weight='bold'>
            {formatDistance(summary.distance)}
          </PretendardText>
          {' 걸었어요'}
        </PretendardText>
      )}
      <View style={styles.grid}>
        {metrics.map(metric => (
          <View key={metric.label} style={styles.metric}>
            <PretendardText style={styles.metricLabel}>
              {metric.label}
            </PretendardText>
            {/* 숫자라 콘덴스드를 쓴다 — 이 화면은 수치가 전부다(ACG). `기록 없음`은
                한글이라 콘덴스드에 글리프가 없어 본문 서체로 떨어뜨린다. */}
            {metric.value === EMPTY_METRIC ? (
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
    fontSize: 22,
    lineHeight: 32,
    color: Acg.ink,
  },
  headlineValue: {
    color: Acg.limeText,
  },
  // 이 화면의 주 정보라 종이 면으로 띄운다 — 회색 면은 지면과 톤이 가까워 안 떠 보였다
  // (2026-08-05 디자인 리뷰).
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 14,
    backgroundColor: Acg.controlFill,
  },
  metric: {
    // 2열 그리드. 고정 높이를 두지 않아 Dynamic Type에서 값이 잘리지 않는다.
    width: '50%',
    gap: 4,
    paddingVertical: 8,
  },
  metricLabel: {
    fontSize: AcgFontSize.meta,
    color: Acg.textMuted,
  },
  metricValue: {
    fontSize: 22,
    lineHeight: 26,
    color: Acg.ink,
  },
  metricEmpty: {
    fontSize: 15,
    lineHeight: 26,
    color: Acg.textMuted,
  },
});

export default BagActivitySummaryView;
