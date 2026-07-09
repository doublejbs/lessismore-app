import { FC, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import { Color, Radius, Spacing } from '@/constants/DesignTokens';
import BagWeather from '@/model/bag/BagWeather';
import { summarizeWeatherPeriod } from '@/model/weather/WeatherCode';
import WeatherLocationSearchView from './WeatherLocationSearchView';
import WeatherDailyView from './WeatherDailyView';

interface Props {
  bagWeather: BagWeather;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const BagWeatherView: FC<Props> = ({ bagWeather }) => {
  const router = useRouter();
  const [searchActive, setSearchActive] = useState(false);
  const location = bagWeather.getLocation();
  const weather = bagWeather.getWeather();
  const loading = bagWeather.isLoading();
  const error = bagWeather.hasError();

  // #1 여행 기간 라벨.
  const start = bagWeather.getStartDate();
  const end = bagWeather.getEndDate();
  const fmtDay = (d: typeof start) => `${d.format('M.D')}(${WEEKDAYS[d.day()]})`;
  const periodLabel = start.isSame(end, 'day')
    ? fmtDay(start)
    : `${fmtDay(start)} ~ ${fmtDay(end)}`;

  // #6 기간 요약(대표 날씨 + 최고/최저 + 강한 돌풍). 카드와 동일 규칙 공유.
  const summary = weather ? summarizeWeatherPeriod(weather.daily) : null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name='chevron-back' size={24} color={Color.textPrimary} />
        </TouchableOpacity>
        <PretendardText style={styles.headerTitle} weight='bold'>
          여행지 날씨
        </PretendardText>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.body}>
        <WeatherLocationSearchView
          bagWeather={bagWeather}
          onActiveChange={setSearchActive}
        />

        {!searchActive && (
          <ScrollView
            style={styles.weatherScroll}
            contentContainerStyle={styles.weatherContent}
            keyboardShouldPersistTaps='handled'
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.divider} />

            {!location ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name='partly-sunny-outline'
                  size={40}
                  color={Color.iconMuted}
                />
                <PretendardText style={styles.emptyText}>
                  여행지를 설정하면{'\n'}기간 동안의 날씨를 볼 수 있어요
                </PretendardText>
              </View>
            ) : loading && !weather ? (
              <View style={styles.centerState}>
                <ActivityIndicator color={Color.textSecondary} />
              </View>
            ) : error && !weather ? (
              <View style={styles.centerState}>
                <PretendardText style={styles.emptyText}>
                  날씨를 불러오지 못했어요
                </PretendardText>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => bagWeather.ensureFresh()}
                >
                  <PretendardText style={styles.retryText} weight='medium'>
                    다시 시도
                  </PretendardText>
                </TouchableOpacity>
              </View>
            ) : weather ? (
              <View>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <PretendardText style={styles.sectionTitle} weight='bold'>
                      여행 기간 날씨
                    </PretendardText>
                    {loading && (
                      <ActivityIndicator
                        size='small'
                        color={Color.textSecondary}
                      />
                    )}
                  </View>
                  <PretendardText style={styles.periodText}>
                    {periodLabel}
                  </PretendardText>
                  {summary && (
                    <PretendardText style={styles.summaryText} weight='medium'>
                      {summary.cond} · ↑{summary.high}° ↓{summary.low}°
                      {summary.maxGust != null &&
                        summary.maxGust >= 10 &&
                        ` · 돌풍 ${summary.maxGust}m/s`}
                    </PretendardText>
                  )}
                </View>
                <WeatherDailyView daily={weather.daily} />
                <PretendardText style={styles.disclaimer}>
                  예보는 향후 16일까지 제공되며, 그 이후는 과거 평년값을 참고로
                  표시합니다.
                </PretendardText>
              </View>
            ) : null}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Color.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenH,
    height: 52,
  },
  headerTitle: {
    fontSize: 17,
    color: Color.textPrimary,
  },
  headerSpacer: {
    width: 24,
  },
  body: {
    flex: 1,
    paddingHorizontal: Spacing.screenH,
  },
  weatherScroll: {
    flex: 1,
  },
  weatherContent: {
    paddingBottom: 40,
  },
  divider: {
    height: 1,
    backgroundColor: Color.borderLight,
    marginVertical: 20,
  },
  emptyState: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 40,
  },
  centerState: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: Color.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.input,
    backgroundColor: Color.surfaceMuted,
  },
  retryText: {
    fontSize: 14,
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
    fontSize: 16,
    color: Color.textPrimary,
  },
  periodText: {
    fontSize: 13,
    color: Color.textSecondary,
  },
  summaryText: {
    fontSize: 13,
    color: Color.textPrimary,
  },
  disclaimer: {
    fontSize: 12,
    color: Color.textSecondary,
    lineHeight: 18,
    marginTop: 16,
  },
});

export default observer(BagWeatherView);
