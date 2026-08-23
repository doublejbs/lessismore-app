import { FC } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import { AcgType, Color, Radius } from '@/constants/DesignTokens';
import BagWeather from '@/model/bag/BagWeather';
import { summarizeWeatherPeriod } from '@/model/weather/WeatherCode';
import WeatherDailyView from './WeatherDailyView';
import app from '@/model/app/App';

interface Props {
  bagWeather: BagWeather;
}

// 여행 기간 날씨 섹션(WT-4). 요약 + 일별 목록 + 로딩/실패(재시도) 처리는 기존 규칙을 그대로 유지한다.
// 여행지 허브(DST-8)의 하단 블록으로, 여행지 정보·길찾기와 독립적으로 동작한다.
const BagTripWeatherView: FC<Props> = ({ bagWeather }) => {
  const l10n = app.getL10n();
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
        <ActivityIndicator color={Color.textSecondary} />
      </View>
    );
  }

  if (error && !weather) {
    return (
      <View style={styles.centerState}>
        <PretendardText style={styles.emptyText}>
          {l10n.t('weather.loadFailed')}
        </PretendardText>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => bagWeather.ensureFresh()}
          accessibilityRole='button'
          accessibilityLabel={l10n.t('weather.retryAccessibility')}
        >
          <PretendardText style={styles.retryText} weight='medium'>
            {l10n.t('weather.retry')}
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
        <View style={styles.sectionTitleRow}>
          <PretendardText style={styles.sectionTitle} weight='bold'>
            {l10n.t('weather.sectionTitle')}
          </PretendardText>
          {loading && (
            <ActivityIndicator size='small' color={Color.textSecondary} />
          )}
        </View>
        {summary && (
          <PretendardText style={styles.summaryText} weight='medium'>
            {l10n.t('weather.summary', {
              condition: summary.cond,
              low: summary.low,
              high: summary.high,
              gust:
                summary.maxGust != null && summary.maxGust >= 10
                  ? l10n.t('weather.gustSuffix', { speed: summary.maxGust })
                  : '',
            })}
          </PretendardText>
        )}
      </View>
      <WeatherDailyView daily={tripDaily} />
      <PretendardText style={styles.disclaimer}>
        {l10n.t('weather.disclaimer')}
      </PretendardText>
    </View>
  );
};

const styles = StyleSheet.create({
  centerState: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 40,
  },
  emptyText: {
    ...AcgType.rowSubtitle,
    color: Color.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: Radius.input,
    backgroundColor: Color.surfaceMuted,
  },
  retryText: {
    ...AcgType.control,
    color: Color.textPrimary,
  },
  sectionHeader: {
    marginBottom: 12,
    gap: 3,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    ...AcgType.rowSubtitle,
    color: Color.textPrimary,
  },
  summaryText: {
    ...AcgType.meta,
    color: Color.textPrimary,
  },
  disclaimer: {
    ...AcgType.meta,
    color: Color.textSecondary,
    marginTop: 16,
  },
});

export default observer(BagTripWeatherView);
