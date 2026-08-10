import { FC, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import PretendardText from '@/components/PretendardText';
import LiquidCard from '@/components/liquid/LiquidCard';
import LiquidSectionLabel from '@/components/liquid/LiquidSectionLabel';
import { Liquid } from '@/constants/DesignTokens';
import { HealthSeriesPoint } from '@/model/health/HealthTypes';
import { formatClockTime } from '@/model/health/HealthFormat';

interface Props {
  title: string;
  /** 축 라벨에 붙는 보조 설명. 페이스처럼 값의 방향이 직관적이지 않을 때 쓴다. */
  hint?: string;
  points: HealthSeriesPoint[];
  /** 데이터 시각화 색 — 의미색 예외라 호출측이 `LiquidViz`에서 골라 넘긴다. */
  color: string;
  formatValue: (value: number) => string;
}

const CHART_HEIGHT = 96;
/** 선이 위아래로 잘리지 않게 두는 안쪽 여백(px). */
const CHART_VERTICAL_PADDING = 8;
/**
 * 그릴 최대 점 개수. 심박은 초 단위로 수천 점이 오는데 화면 폭이 400px 안팎이라
 * 그 이상은 화질에 기여하지 않고 SVG path 문자열만 키운다.
 */
const MAX_CHART_POINTS = 120;
const MIN_CHART_POINTS = 2;
const LINE_WIDTH = 2;

/** 균등 간격으로 솎아 낸다. 첫 점과 마지막 점은 항상 남긴다. */
const downsample = (points: HealthSeriesPoint[]): HealthSeriesPoint[] => {
  if (points.length <= MAX_CHART_POINTS) {
    return points;
  }

  const step = (points.length - 1) / (MAX_CHART_POINTS - 1);

  return Array.from({ length: MAX_CHART_POINTS }, (_, index) => {
    return points[Math.round(index * step)];
  });
};

// 심박·페이스 추이 라인 차트(HA-4). 이 저장소엔 차트 라이브러리가 없어
// react-native-svg로 직접 그린다 — 축·격자 없는 단순 추이선이라 의존성을 늘릴 이유가 없다.
const BagActivityChartView: FC<Props> = ({
  title,
  hint,
  points,
  color,
  formatValue,
}) => {
  const [width, setWidth] = useState(0);

  const handleLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  };

  if (points.length < MIN_CHART_POINTS) {
    return null;
  }

  const sampled = downsample(points);
  const values = sampled.map(point => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const firstPoint = sampled[0];
  const lastPoint = sampled[sampled.length - 1];
  const startTime = firstPoint.timestamp.getTime();
  const timeSpan = lastPoint.timestamp.getTime() - startTime;
  const valueSpan = maxValue - minValue;
  const drawableHeight = CHART_HEIGHT - CHART_VERTICAL_PADDING * 2;

  const getX = (point: HealthSeriesPoint, index: number) => {
    // 모든 표본의 시각이 같은(=시간 정보가 없는) 경우엔 순서대로 균등 배치한다.
    if (timeSpan <= 0) {
      return (index / (sampled.length - 1)) * width;
    }

    return ((point.timestamp.getTime() - startTime) / timeSpan) * width;
  };

  const getY = (value: number) => {
    // 값이 전부 같으면 중앙에 수평선을 그린다(0으로 나누지 않기 위함).
    if (valueSpan <= 0) {
      return CHART_HEIGHT / 2;
    }

    return (
      CHART_VERTICAL_PADDING +
      (1 - (value - minValue) / valueSpan) * drawableHeight
    );
  };

  const linePath = sampled
    .map((point, index) => {
      const command = index === 0 ? 'M' : 'L';

      return `${command}${getX(point, index).toFixed(1)} ${getY(point.value).toFixed(1)}`;
    })
    .join(' ');

  return (
    // 요약 카드와 같은 종이 면 — 테두리로 경계를 내던 방식은 다른 카드와 갈렸다.
    <LiquidCard tone='paper' radius='card' style={styles.card}>
      {/* 카드 머리는 대문자 마이크로 라벨(이 시스템의 서명). 힌트는 같은 줄 우측에 붙인다. */}
      <LiquidSectionLabel
        trailing={
          hint !== undefined ? (
            <PretendardText style={styles.hint}>{hint}</PretendardText>
          ) : undefined
        }
      >
        {title}
      </LiquidSectionLabel>
      <View style={styles.chart} onLayout={handleLayout}>
        {width > 0 && (
          <Svg width={width} height={CHART_HEIGHT}>
            <Path
              d={linePath}
              stroke={color}
              strokeWidth={LINE_WIDTH}
              strokeLinejoin='round'
              strokeLinecap='round'
              fill='none'
            />
          </Svg>
        )}
      </View>
      <View style={styles.axis}>
        <PretendardText style={styles.axisText}>
          {formatClockTime(firstPoint.timestamp)}
        </PretendardText>
        <PretendardText style={styles.axisText}>
          {formatValue(minValue)} ~ {formatValue(maxValue)}
        </PretendardText>
        <PretendardText style={styles.axisText}>
          {formatClockTime(lastPoint.timestamp)}
        </PretendardText>
      </View>
    </LiquidCard>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: 6,
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
    color: Liquid.inkTertiary,
  },
  chart: {
    height: CHART_HEIGHT,
  },
  axis: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  // 축 라벨은 수치지만 캡션 자리라 본문 서체를 쓴다 — 콘덴스드는 무게·진행률처럼
  // 값 자체를 보여주는 자리에만 쓴다(핸드오프 타입 규칙).
  axisText: {
    fontSize: 12,
    lineHeight: 17,
    color: Liquid.inkMuted,
  },
});

export default BagActivityChartView;
