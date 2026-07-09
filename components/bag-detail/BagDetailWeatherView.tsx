import { FC } from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import app from '@/model/app/App';
import BagDetail from '@/model/bag-detail/BagDetail';
import PretendardText from '@/components/PretendardText';
import { Color, Radius, Spacing } from '@/constants/DesignTokens';
import { summarizeWeatherPeriod } from '@/model/weather/WeatherCode';

interface Props {
  bagDetail: BagDetail;
}

const BagDetailWeatherView: FC<Props> = ({ bagDetail }) => {
  const router = useRouter();
  const bagWeather = bagDetail.getBagWeather();
  const location = bagWeather.getLocation();
  const weather = bagWeather.getWeather();
  const loading = bagWeather.isLoading();

  const handlePress = () => {
    app.getAnalyticsManager()?.logClick('bag_weather');
    router.push(`/bag/${bagDetail.getId()}/weather`);
  };

  // 요약: 날씨 페이지와 동일 규칙(눈>비>맑음) — 대표 아이콘·최저~최고.
  const summary = weather ? summarizeWeatherPeriod(weather.daily) : null;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.touchable}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.left}>
          <Ionicons
            name={summary ? summary.icon : 'partly-sunny-outline'}
            size={20}
            color={Color.textPrimary}
          />
          {location && summary ? (
            <PretendardText style={styles.text} weight='medium'>
              {location.name} · {summary.low}~{summary.high}°
            </PretendardText>
          ) : location ? (
            <PretendardText style={styles.text} weight='medium'>
              {location.name}
            </PretendardText>
          ) : (
            <PretendardText style={styles.text} weight='medium'>
              여행지 날씨 보기
            </PretendardText>
          )}
        </View>
        {loading && !summary ? (
          <ActivityIndicator size='small' color={Color.textSecondary} />
        ) : (
          <Ionicons name='chevron-forward' size={24} color={Color.textPrimary} />
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.screenH,
    paddingVertical: 12,
    marginBottom: 8,
    backgroundColor: Color.background,
  },
  touchable: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: Radius.card,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    flex: 1,
    fontSize: 17,
    color: Color.textPrimary,
  },
});

export default observer(BagDetailWeatherView);
