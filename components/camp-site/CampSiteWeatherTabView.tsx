import { FC } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';
import WeatherDailyView from '@/components/weather/WeatherDailyView';
import CampSiteWeather from '@/model/camp-site/CampSiteWeather';

interface Props {
  campSiteWeather: CampSiteWeather;
}

// 상세 시트 '날씨' 탭(CS-3) — 주간 예보만 렌더한다.
// 박지명 헤더는 시트 고정 영역(CampSiteDetailView)이 이미 갖고 있어 두지 않는다.
const CampSiteWeatherTabView: FC<Props> = ({ campSiteWeather }) => {
  const initialized = campSiteWeather.isInitialized();
  const loading = campSiteWeather.isLoading();
  const weather = campSiteWeather.getWeather();
  const error = campSiteWeather.hasError();

  const handlePressRetry = () => {
    void campSiteWeather.retry();
  };

  if (!initialized || loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator color={Color.textPrimary} />
      </View>
    );
  }

  if (error || !weather) {
    return (
      <View style={styles.centerBox}>
        <PretendardText style={styles.errorText}>
          날씨를 불러오지 못했어요
        </PretendardText>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={handlePressRetry}
          activeOpacity={0.7}
          accessibilityLabel='다시 시도'
          accessibilityRole='button'
        >
          <PretendardText style={styles.retryText} weight='semibold'>
            다시 시도
          </PretendardText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.content}
      contentContainerStyle={styles.contentContainer}
    >
      <WeatherDailyView daily={weather} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 15,
    color: Color.textSecondary,
  },
  retryButton: {
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Color.chipBorder,
    borderRadius: Radius.card,
    paddingHorizontal: 20,
  },
  retryText: {
    fontSize: 15,
    color: Color.textPrimary,
  },
});

export default observer(CampSiteWeatherTabView);
