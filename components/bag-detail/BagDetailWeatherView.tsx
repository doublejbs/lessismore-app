import { FC } from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import app from '@/model/app/App';
import BagDetail from '@/model/bag-detail/BagDetail';
import PretendardText from '@/components/PretendardText';
import { Color, Radius, Spacing } from '@/constants/DesignTokens';
import { getWeatherCodeInfo } from '@/model/weather/WeatherCode';

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

  // 요약: 기간 전체 최저~최고 + 강수가 가장 큰 날의 대표 아이콘.
  const summary = (() => {
    if (!weather || weather.daily.length === 0) {
      return null;
    }
    const daily = weather.daily;
    const tempMin = Math.round(Math.min(...daily.map(d => d.tempMin)));
    const tempMax = Math.round(Math.max(...daily.map(d => d.tempMax)));
    const rep = daily.reduce((worst, d) => {
      const p = d.precipProb ?? d.precipSum ?? 0;
      const wp = worst.precipProb ?? worst.precipSum ?? 0;
      return p > wp ? d : worst;
    }, daily[0]);
    return { tempMin, tempMax, icon: getWeatherCodeInfo(rep.code).icon };
  })();

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
              {location.name} · {summary.tempMin}~{summary.tempMax}°
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
