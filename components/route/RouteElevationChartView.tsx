import { FC, useCallback, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import {
  findRouteElevationSample,
  RouteElevationProfile,
  RouteElevationSample,
} from '@/model/route/RouteElevation';
import {
  formatRouteAltitude,
  formatRouteDistance,
} from '@/model/route/RouteFormat';

interface Props {
  profile: RouteElevationProfile;
  /**
   * 훑은 지점을 알린다. 넘기지 않으면 제스처 자체를 달지 않는다 —
   * 웹은 지도가 목록으로 대체되어 따라 움직일 마커가 없다(GRP-8 · APP-5).
   */
  onScrub?: ((sample: RouteElevationSample | null) => void) | undefined;
  /**
   * 목록 행이 쓰는 **원본 트랙 거리**(m). 단면은 축약 좌표(최대 500점)로 다시 잰 값이라
   * 원본보다 늘 짧다 — 목록에 `31.5km`, 축에 `31.0km`가 나란히 서면 한 코스의 숫자가 둘로
   * 보인다. 그래서 **표시만** 이 값을 기준으로 환산한다(GRP-8 · BD-11, 2026-09-18 사용자 결정).
   * 넘기지 않으면 축약 거리를 그대로 쓴다.
   */
  displayDistance?: number | undefined;
  // 지도 화면처럼 그래프가 화면 맨 아래에 놓일 때 세이프에어리어를 여기서 비운다.
  bottomInset?: number | undefined;
}

const CHART_HEIGHT = 96;
/** 선이 위아래로 잘리지 않게 두는 안쪽 여백(px). */
const CHART_VERTICAL_PADDING = 8;
const LINE_WIDTH = 2;
const CURSOR_WIDTH = 1.5;
const PEAK_RADIUS = 3;
const CURSOR_RADIUS = 4.5;

/**
 * 단면 색. 데이터 시각화 색이라 토큰 예외로 하드코딩한다(CLAUDE.md).
 * 지도의 코스 폴리라인과 **같은 파랑**이다 — 그래프와 지도가 한 코스를 가리키므로 색이 갈리면
 * 훑는 동안 둘이 같은 것이라는 단서가 사라진다.
 */
const PROFILE_COLOR = '#2F6BFF';
const PROFILE_FILL = 'rgba(47, 107, 255, 0.14)';

/**
 * 고도 단면 그래프 (GRP-8, BD-11). 그룹 지도와 배낭 코스 화면이 같은 그래프를 쓴다.
 *
 * 차트 라이브러리를 들이지 않고 `react-native-svg`로 직접 그린다 — 이 저장소의 선례
 * (`components/bag-detail/health/BagActivityChartView.tsx`)와 같은 판단이고, 축·격자 없는
 * 단면 하나에 의존성을 늘릴 이유가 없다.
 *
 * 축은 **시작·끝 거리와 최고점**만 적는다. 눈금을 촘촘히 깔면 숫자가 그래프보다 눈에 먼저
 * 들어와, "어디가 오르막인가"라는 이 그래프의 유일한 질문이 가려진다.
 *
 * 훑기는 표본 객체의 **참조가 바뀔 때만** 상태를 올린다 — 손가락 한 번에 수십 번 들어오는
 * 이벤트를 그대로 렌더로 흘리면 지도 마커가 프레임마다 다시 동기화된다.
 */
const RouteElevationChartView: FC<Props> = ({
  profile,
  onScrub,
  displayDistance,
  bottomInset,
}) => {
  const l10n = app.getL10n();
  const [width, setWidth] = useState(0);
  const [cursor, setCursor] = useState<RouteElevationSample | null>(null);
  const interactive = !!onScrub;

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  }, []);

  /**
   * 표본은 `profile.samples`의 원소를 그대로 돌려받는다 — 같은 지점을 계속 훑는 동안
   * 참조가 같아 React가 렌더를 걸러 준다. 그래서 바뀌었는지를 따로 재지 않는다.
   */
  const handleScrub = useCallback(
    (x: number) => {
      if (width <= 0) {
        return;
      }

      const sample = findRouteElevationSample(profile, x / width);

      setCursor(sample);
      onScrub?.(sample);
    },
    [onScrub, profile, width]
  );

  const handleScrubEnd = useCallback(() => {
    setCursor(null);
    onScrub?.(null);
  }, [onScrub]);

  const scrubGesture = useMemo(
    () =>
      Gesture.Pan()
        // 훑기는 첫 접촉부터 값을 읽어야 한다 — 이동 임계를 두면 손가락을 댄 자리가 건너뛴다.
        .minDistance(0)
        .shouldCancelWhenOutside(false)
        .runOnJS(true)
        .onBegin(event => handleScrub(event.x))
        .onUpdate(event => handleScrub(event.x))
        .onFinalize(handleScrubEnd),
    [handleScrub, handleScrubEnd]
  );

  const geometry = useMemo(() => {
    if (width <= 0) {
      return null;
    }

    const { samples, totalDistance, minElevation, maxElevation } = profile;
    const elevationSpan = maxElevation - minElevation;
    const drawableHeight = CHART_HEIGHT - CHART_VERTICAL_PADDING * 2;
    const toX = (distance: number) => {
      // 같은 자리를 맴도는 트랙(총 거리 0)은 가운데에 수직선 하나로 둔다.
      if (totalDistance <= 0) {
        return width / 2;
      }

      return (distance / totalDistance) * width;
    };
    const toY = (elevation: number) => {
      // 고도가 전부 같으면 중앙에 수평선을 그린다(0으로 나누지 않기 위함).
      if (elevationSpan <= 0) {
        return CHART_HEIGHT / 2;
      }

      return (
        CHART_VERTICAL_PADDING +
        (1 - (elevation - minElevation) / elevationSpan) * drawableHeight
      );
    };
    const line = samples
      .map((sample, index) => {
        return `${index === 0 ? 'M' : 'L'}${toX(sample.distance).toFixed(
          2
        )} ${toY(sample.elevation).toFixed(2)}`;
      })
      .join(' ');

    return {
      line,
      area: `${line} L${width.toFixed(2)} ${CHART_HEIGHT} L0 ${CHART_HEIGHT} Z`,
      toX,
      toY,
    };
  }, [profile, width]);

  const peak = profile.samples[profile.peakIndex];
  /**
   * 축약 거리를 원본 거리로 옮기는 배율. 내부 계산(표본 탐색·x 좌표)은 축약 거리를 그대로
   * 쓰고 **표시만** 환산한다 — 표본의 거리 값을 건드리면 손가락 위치와 지도 마커가 어긋난다.
   * 총 거리가 0(같은 자리를 맴도는 트랙)이면 나누지 않는다.
   */
  const distanceScale =
    displayDistance !== undefined && profile.totalDistance > 0
      ? displayDistance / profile.totalDistance
      : 1;
  const totalDisplayDistance = profile.totalDistance * distanceScale;
  /**
   * 그래프 아래 한 줄. 훑는 중에는 **거리·고도**를, 아닐 때는 훑을 수 있다는 안내를 읽힌다 —
   * 같은 자리를 두 용도로 써서 안내가 공간을 더 먹지 않는다. 웹은 훑기가 없으므로 비운다.
   */
  const readout = cursor
    ? [
        formatRouteDistance(
          cursor.distance * distanceScale,
          totalDisplayDistance
        ),
        formatRouteAltitude(cursor.elevation),
      ].join(l10n.t('common.metaSeparator'))
    : null;

  const chart = (
    <View
      style={styles.chart}
      onLayout={handleLayout}
      accessible
      accessibilityRole='image'
      accessibilityLabel={l10n.t('route.profileTitle')}
      {...(interactive
        ? { accessibilityHint: l10n.t('route.profileHint') }
        : {})}
    >
      {geometry ? (
        <Svg width={width} height={CHART_HEIGHT}>
          <Path d={geometry.area} fill={PROFILE_FILL} />
          <Path
            d={geometry.line}
            stroke={PROFILE_COLOR}
            strokeWidth={LINE_WIDTH}
            strokeLinejoin='round'
            strokeLinecap='round'
            fill='none'
          />
          <Circle
            cx={geometry.toX(peak.distance)}
            cy={geometry.toY(peak.elevation)}
            r={PEAK_RADIUS}
            fill={PROFILE_COLOR}
          />
          {cursor ? (
            <>
              <Line
                x1={geometry.toX(cursor.distance)}
                y1={0}
                x2={geometry.toX(cursor.distance)}
                y2={CHART_HEIGHT}
                stroke={Acg.ink}
                strokeWidth={CURSOR_WIDTH}
              />
              <Circle
                cx={geometry.toX(cursor.distance)}
                cy={geometry.toY(cursor.elevation)}
                r={CURSOR_RADIUS}
                fill={Acg.ink}
                stroke={Acg.paper}
                strokeWidth={LINE_WIDTH}
              />
            </>
          ) : null}
        </Svg>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.container, { paddingBottom: bottomInset ?? 12 }]}>
      <View style={styles.header}>
        <PretendardText weight='semibold' style={styles.title}>
          {l10n.t('route.profileTitle')}
        </PretendardText>
        <PretendardText style={styles.readout} numberOfLines={1}>
          {l10n.t('route.profilePeak', {
            value: Math.round(profile.maxElevation),
          })}
        </PretendardText>
      </View>
      {interactive ? (
        <GestureDetector gesture={scrubGesture}>{chart}</GestureDetector>
      ) : (
        chart
      )}
      {/* 훑기가 없는 웹에는 안내도 수치도 띄우지 않는다 — 줄 자체를 그리지 않는다(APP-5). */}
      {interactive ? (
        <PretendardText
          style={[styles.hint, !!cursor && styles.hintActive]}
          numberOfLines={1}
        >
          {readout ?? l10n.t('route.profileScrubHint')}
        </PretendardText>
      ) : null}
      <View style={styles.axis}>
        <PretendardText style={styles.axisText}>
          {formatRouteDistance(0, totalDisplayDistance)}
        </PretendardText>
        <PretendardText style={styles.axisText}>
          {formatRouteDistance(totalDisplayDistance)}
        </PretendardText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 6,
    paddingTop: 12,
    paddingHorizontal: AcgLayout.screenPadding,
    backgroundColor: Acg.paper,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
  readout: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
    flexShrink: 1,
  },
  chart: {
    height: CHART_HEIGHT,
  },
  /**
   * 훑을 수 있다는 유일한 시각 단서다(그전에는 `accessibilityHint`에만 있었다). 훑는 동안
   * 같은 자리가 거리·고도를 읽으므로 줄 수가 늘지 않는다 — 글자만 뮤트에서 잉크로 바뀐다.
   */
  hint: {
    ...AcgType.meta,
    color: Acg.textMuted,
    textAlign: 'center',
  },
  hintActive: {
    color: Acg.ink,
  },
  axis: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  axisText: {
    ...AcgType.meta,
    color: Acg.textMuted,
  },
});

export default RouteElevationChartView;
