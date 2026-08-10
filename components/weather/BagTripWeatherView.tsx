import { FC } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import LiquidSectionLabel from '@/components/liquid/LiquidSectionLabel';
import {
  Liquid,
  LiquidLayout,
  LiquidMotion,
  LiquidRadius,
} from '@/constants/DesignTokens';
import BagWeather from '@/model/bag/BagWeather';
import { summarizeWeatherPeriod } from '@/model/weather/WeatherCode';
import WeatherDailyView from './WeatherDailyView';

interface Props {
  bagWeather: BagWeather;
}

// 여행 기간 날씨 섹션(WT-4). 요약 + 일별 목록 + 로딩/실패(재시도) 처리는 기존 규칙을 그대로 유지한다.
// 여행지 허브(DST-8)의 하단 블록으로, 여행지 정보·길찾기와 독립적으로 동작한다.
const BagTripWeatherView: FC<Props> = ({ bagWeather }) => {
  const weather = bagWeather.getWeather();
  const loading = bagWeather.isLoading();
  const error = bagWeather.hasError();

  // 여행 기간에 해당하는 일자만(스냅샷이 옛 더 넓은 기간을 담고 있어도 기간으로 제한).
  const tripDaily = bagWeather.getDailyInRange();

  // 기간 요약(대표 날씨 + 최고/최저 + 강한 돌풍). 카드와 동일 규칙 공유.
  const summary =
    tripDaily.length > 0 ? summarizeWeatherPeriod(tripDaily) : null;

  if (loading && !weather) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color={Liquid.ink} />
      </View>
    );
  }

  if (error && !weather) {
    return (
      <View style={styles.centerState}>
        <PretendardText style={styles.emptyText}>
          날씨를 불러오지 못했어요
        </PretendardText>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => bagWeather.ensureFresh()}
          activeOpacity={LiquidMotion.pressOpacity}
          accessibilityRole='button'
          accessibilityLabel='날씨 다시 시도'
        >
          <PretendardText style={styles.retryText} weight='semibold'>
            다시 시도
          </PretendardText>
        </TouchableOpacity>
      </View>
    );
  }

  if (!weather) {
    return null;
  }

  return (
    <View>
      <View style={styles.sectionHeader}>
        <LiquidSectionLabel
          trailing={
            loading ? (
              <ActivityIndicator size='small' color={Liquid.ink} />
            ) : undefined
          }
        >
          여행 기간 날씨
        </LiquidSectionLabel>
        {summary && (
          <PretendardText style={styles.summaryText} weight='medium'>
            {summary.cond} · ↑{summary.high}° ↓{summary.low}°
            {summary.maxGust != null &&
              summary.maxGust >= 10 &&
              ` · 돌풍 ${summary.maxGust}m/s`}
          </PretendardText>
        )}
      </View>
      <WeatherDailyView daily={tripDaily} />
      <PretendardText style={styles.disclaimer}>
        예보는 향후 16일까지 제공되며, 그 이후는 과거 평년값을 참고로
        표시합니다.
      </PretendardText>
    </View>
  );
};

const styles = StyleSheet.create({
  centerState: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: Liquid.inkTertiary,
    textAlign: 'center',
  },
  // 흰 알약 — 이 화면의 주 액션과 다투지 않는 보조 복구 액션이다(박지 상세 날씨 탭과 같은 처리).
  retryButton: {
    minHeight: LiquidLayout.touchMin,
    paddingHorizontal: 20,
    justifyContent: 'center',
    borderRadius: LiquidRadius.pill,
    backgroundColor: Liquid.surface,
    borderWidth: 0.5,
    borderColor: Liquid.hairlineStrong,
  },
  retryText: {
    fontSize: 14,
    color: Liquid.ink,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 13,
    color: Liquid.inkSecondary,
  },
  disclaimer: {
    marginTop: 16,
    fontSize: 12,
    lineHeight: 18,
    color: Liquid.inkMuted,
  },
});

export default observer(BagTripWeatherView);
