import { FC } from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import app from '@/model/app/App';
import BagDetail from '@/model/bag-detail/BagDetail';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';
import { summarizeWeatherPeriod } from '@/model/weather/WeatherCode';

interface Props {
  bagDetail: BagDetail;
  emphasized?: boolean;
}

const EMPHASIZED_SUB = '#B9B9B9';

const BagDetailWeatherView: FC<Props> = ({ bagDetail, emphasized = false }) => {
  const router = useRouter();
  const bagWeather = bagDetail.getBagWeather();
  const location = bagWeather.getLocation();
  const weather = bagWeather.getWeather();

  const handlePress = () => {
    app.getAnalyticsManager()?.logClick('bag_weather');
    router.push(`/bag/${bagDetail.getId()}/weather`);
  };

  const summary = weather ? summarizeWeatherPeriod(weather.daily) : null;
  const fg = emphasized ? Color.background : Color.textPrimary;
  const subFg = emphasized ? EMPHASIZED_SUB : Color.textSecondary;

  return (
    <TouchableOpacity
      style={[styles.tile, emphasized && styles.tileEmphasized]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.iconRow}>
        <Ionicons
          name={summary ? summary.icon : 'partly-sunny-outline'}
          size={24}
          color={fg}
        />
        {summary && (
          <PretendardText style={[styles.cond, { color: subFg }]} weight='medium'>
            {summary.cond}
          </PretendardText>
        )}
      </View>
      {summary && location ? (
        <View style={styles.textWrap}>
          <PretendardText style={[styles.temp, { color: fg }]} weight='bold'>
            {summary.low}~{summary.high}°
          </PretendardText>
          <PretendardText style={[styles.subtitle, { color: subFg }]} numberOfLines={1}>
            {location.name}
          </PretendardText>
        </View>
      ) : (
        <View style={styles.textWrap}>
          <PretendardText style={[styles.title, { color: fg }]} weight='medium'>
            날씨
          </PretendardText>
          <PretendardText style={[styles.subtitle, { color: subFg }]} numberOfLines={1}>
            {location ? location.name : '여행지 설정'}
          </PretendardText>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  tile: {
    width: '48%',
    minHeight: 92,
    backgroundColor: Color.surfaceMuted,
    borderRadius: Radius.card,
    padding: 14,
    justifyContent: 'space-between',
  },
  tileEmphasized: {
    backgroundColor: Color.chipActiveBg,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textWrap: {
    gap: 2,
  },
  title: {
    fontSize: 15,
  },
  temp: {
    fontSize: 22,
  },
  cond: {
    fontSize: 13,
  },
  subtitle: {
    fontSize: 12,
  },
});

export default observer(BagDetailWeatherView);
