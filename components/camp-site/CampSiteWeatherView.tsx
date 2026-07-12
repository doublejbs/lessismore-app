import { FC } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';
import WeatherDailyView from '@/components/weather/WeatherDailyView';
import CampSiteWeather from '@/model/camp-site/CampSiteWeather';

interface Props {
  campSiteWeather: CampSiteWeather;
}

const CampSiteWeatherView: FC<Props> = ({ campSiteWeather }) => {
  const spot = campSiteWeather.getSpot();
  const loading = campSiteWeather.isLoading();
  const weather = campSiteWeather.getWeather();
  const error = campSiteWeather.hasError();

  const handlePressClose = () => {
    campSiteWeather.close();
  };

  const handlePressRetry = () => {
    void campSiteWeather.retry();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handlePressClose}
          style={styles.backButton}
          accessibilityLabel='뒤로 가기'
          accessibilityRole='button'
        >
          <Ionicons name='chevron-back' size={24} color={Color.textPrimary} />
        </TouchableOpacity>
        <PretendardText style={styles.title} weight='bold' numberOfLines={1}>
          {spot ? spot.name : '주간 날씨'}
        </PretendardText>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={Color.textPrimary} />
        </View>
      ) : error || !weather ? (
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
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
        >
          <WeatherDailyView daily={weather} />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Color.background,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 20,
    backgroundColor: Color.background,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -10,
  },
  title: {
    flex: 1,
    fontSize: 18,
    lineHeight: 24,
    color: Color.textPrimary,
  },
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

export default observer(CampSiteWeatherView);
