import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';
import { getWeatherCodeInfo } from '@/model/weather/WeatherCode';
import { WeatherDaily, WeatherSource } from '@/model/weather/WeatherTypes';

interface Props {
  daily: WeatherDaily[];
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const SOURCE_LABEL: Record<WeatherSource, string> = {
  forecast: '예보',
  archive: '실측',
  normal: '평년',
};

const WeatherDailyRow: FC<{ item: WeatherDaily; isLast: boolean }> = ({
  item,
  isLast,
}) => {
  const info = getWeatherCodeInfo(item.code);
  const d = dayjs(item.date);
  const weekday = WEEKDAYS[d.day()];
  const precipText =
    item.precipProb != null
      ? `${item.precipProb}%`
      : item.precipSum != null
        ? `${item.precipSum}mm`
        : '-';
  const windText =
    item.windSpeedMax != null
      ? `바람 ${Math.round(item.windSpeedMax)}m/s` +
        (item.windGustMax != null
          ? ` · 돌풍 ${Math.round(item.windGustMax)}m/s`
          : '')
      : null;

  return (
    <View style={[styles.row, isLast && styles.rowLast]}>
      <View style={styles.dateCol}>
        <PretendardText style={styles.dateText} weight='semibold'>
          {d.format('M.D')}
        </PretendardText>
        <PretendardText style={styles.weekdayText}>{weekday}</PretendardText>
      </View>

      <Ionicons name={info.icon} size={22} color={Color.textPrimary} />

      <View style={styles.descCol}>
        <PretendardText style={styles.descText}>{info.ko}</PretendardText>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons
              name='water-outline'
              size={12}
              color={Color.textSecondary}
            />
            <PretendardText style={styles.metaText}>{precipText}</PretendardText>
          </View>
          {windText && (
            <PretendardText style={styles.metaText}>{windText}</PretendardText>
          )}
        </View>
      </View>

      <View style={styles.tempCol}>
        <PretendardText style={styles.tempMinText}>
          ↓{Math.round(item.tempMin)}°
        </PretendardText>
        <PretendardText style={styles.tempMaxText} weight='semibold'>
          ↑{Math.round(item.tempMax)}°
        </PretendardText>
      </View>

      <View style={styles.badge}>
        <PretendardText style={styles.badgeText}>
          {SOURCE_LABEL[item.source]}
        </PretendardText>
      </View>
    </View>
  );
};

const WeatherDailyView: FC<Props> = ({ daily }) => {
  return (
    <View style={styles.container}>
      {daily.map((item, index) => (
        <WeatherDailyRow
          key={item.date}
          item={item}
          isLast={index === daily.length - 1}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: Color.borderLight,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  dateCol: {
    width: 44,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 15,
    color: Color.textPrimary,
  },
  weekdayText: {
    fontSize: 12,
    color: Color.textSecondary,
  },
  descCol: {
    flex: 1,
    gap: 2,
  },
  descText: {
    fontSize: 14,
    color: Color.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    columnGap: 10,
    rowGap: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 12,
    color: Color.textSecondary,
  },
  tempCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tempMinText: {
    fontSize: 14,
    color: Color.textSecondary,
  },
  tempMaxText: {
    fontSize: 15,
    color: Color.textPrimary,
  },
  badge: {
    minWidth: 34,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: Radius.listThumb,
    backgroundColor: Color.surfaceMuted,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 11,
    color: Color.textTertiary,
  },
});

export default WeatherDailyView;
