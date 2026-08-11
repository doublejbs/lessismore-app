import { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import PretendardText from '@/components/PretendardText';
import LiquidCard from '@/components/liquid/LiquidCard';
import { Liquid, LiquidFont, LiquidLayout } from '@/constants/DesignTokens';
import { BagActivitySummary } from '@/model/bag/BagActivitySummary';
import {
  formatDistance,
  formatDuration,
  formatElevation,
  formatEnergy,
} from '@/model/health/HealthFormat';
import { formatBagWeight } from '@/model/gear/WeightFormat';

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
  // `condensed`는 값에 한글이 섞이는지로 갈린다 — Archivo Narrow에는 한글 글리프가 없어
  // 한글을 얹으면 글자가 깨진다. `formatDuration`은 `3시간 20분`을, `EMPTY_METRIC`은
  // `기록 없음`을 돌려주므로 이 둘만 본문 서체로 떨어뜨린다.
  // (`formatElevation`의 `850m↑`은 화살표 U+2191까지 Archivo Narrow에 있어 콘덴스드로 둔다.)
  const metrics = [
    {
      label: '총 거리',
      value: formatDistance(summary.distance),
      condensed: true,
    },
    {
      label: '총 시간',
      value: formatDuration(summary.duration),
      condensed: false,
    },
    {
      label: '누적 상승',
      value:
        summary.elevationGain !== undefined
          ? formatElevation(summary.elevationGain)
          : EMPTY_METRIC,
      condensed: summary.elevationGain !== undefined,
    },
    {
      label: '소모 칼로리',
      value:
        summary.activeEnergy !== undefined
          ? formatEnergy(summary.activeEnergy)
          : EMPTY_METRIC,
      condensed: summary.activeEnergy !== undefined,
    },
  ];

  return (
    <View style={styles.container}>
      {/* 이 기능의 핵심 서사 — 무게와 이동을 한 문장으로 잇는다(HA-4). */}
      {weightGrams > 0 && (
        <PretendardText style={styles.headline} weight='bold'>
          {/* 두 수치가 이 문장의 결론이라 라임 계열로 세운다. 밝은 면 위에서는 라임을
              글자색으로 쓸 수 없어 `limeInk`를 쓴다. 한글 문장 안에 섞이는 자리라
              콘덴스드가 아니라 본문 서체를 유지한다. */}
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
      {/* 이 화면의 주 정보라 종이 면으로 띄운다 — 회색 면은 지면과 톤이 가까워 안 떠 보였다
          (2026-08-05 디자인 리뷰). */}
      <LiquidCard tone='paper' radius='card' style={styles.grid}>
        {metrics.map(metric => (
          <View key={metric.label} style={styles.metric}>
            <PretendardText style={styles.metricLabel} weight='semibold'>
              {metric.label}
            </PretendardText>
            {metric.condensed ? (
              <PretendardText style={styles.metricValue}>
                {metric.value}
              </PretendardText>
            ) : (
              <PretendardText style={styles.metricKorean}>
                {metric.value}
              </PretendardText>
            )}
          </View>
        ))}
      </LiquidCard>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: LiquidLayout.cardPad,
  },
  headline: {
    fontSize: 22,
    lineHeight: 30,
    letterSpacing: -0.6,
    color: Liquid.ink,
  },
  headlineValue: {
    color: Liquid.limeInk,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metric: {
    // 2열 그리드. 고정 높이를 두지 않아 Dynamic Type에서 값이 잘리지 않는다.
    width: '50%',
    gap: 4,
    paddingVertical: 8,
  },
  metricLabel: {
    fontSize: 12.5,
    lineHeight: 17,
    color: Liquid.inkMuted,
  },
  metricValue: {
    fontFamily: LiquidFont.condensed,
    fontSize: 22,
    lineHeight: 26,
    color: Liquid.ink,
  },
  // 한글이 섞인 값. 행간을 콘덴스드 값과 같게 두어 2열 그리드의 기준선이 어긋나지 않게 한다.
  metricKorean: {
    fontSize: 15,
    lineHeight: 26,
    color: Liquid.inkTertiary,
  },
});

export default BagActivitySummaryView;
