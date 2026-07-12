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

  const handlePress = () => {
    app.getAnalyticsManager()?.logClick('bag_weather');
    router.push(`/bag/${bagDetail.getId()}/weather`);
  };

  // 여행 기간에 해당하는 일자만으로 요약(스냅샷이 옛 더 넓은 기간을 담고 있어도 기간으로 제한).
  const tripDaily = bagWeather.getDailyInRange();
  const summary = tripDaily.length > 0 ? summarizeWeatherPeriod(tripDaily) : null;
  const fg = emphasized ? Color.background : Color.textPrimary;
  const subFg = emphasized ? EMPHASIZED_SUB : Color.textSecondary;
  const iconName = summary ? summary.icon : 'partly-sunny-outline';

  // 강조 타일은 전체 폭 가로 카드 — 아이콘 좌측, 온도·지역 가운데, 날씨 상태 우측.
  if (emphasized) {
    return (
      <TouchableOpacity
        style={[styles.tile, styles.tileEmphasized, styles.tileFull]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.emphRow}>
          <Ionicons name={iconName} size={26} color={fg} />
          <View style={styles.emphMain}>
            {summary && location ? (
              <>
                <PretendardText style={[styles.temp, { color: fg }]} weight='bold'>
                  {summary.low}~{summary.high}°
                </PretendardText>
                <PretendardText
                  style={[styles.subtitle, { color: subFg }]}
                  numberOfLines={1}
                >
                  {location.name}
                </PretendardText>
              </>
            ) : (
              <>
                <PretendardText style={[styles.title, { color: fg }]} weight='medium'>
                  날씨
                </PretendardText>
                <PretendardText
                  style={[styles.subtitle, { color: subFg }]}
                  numberOfLines={1}
                >
                  {location ? location.name : '여행지 설정'}
                </PretendardText>
              </>
            )}
          </View>
          {summary && (
            <PretendardText style={[styles.cond, { color: subFg }]} weight='medium'>
              {summary.cond}
            </PretendardText>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.tile} onPress={handlePress} activeOpacity={0.7}>
      <View style={styles.iconRow}>
        <Ionicons name={iconName} size={24} color={fg} />
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
  // 강조 타일은 전체 폭 가로 카드 — 세로 공간은 줄이고 좌우로 편다.
  tileFull: {
    width: '100%',
    minHeight: 68,
    justifyContent: 'center',
  },
  emphRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  emphMain: {
    flex: 1,
    gap: 2,
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
