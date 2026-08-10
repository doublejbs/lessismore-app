import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { Liquid, LiquidType } from '@/constants/DesignTokens';
import { getWeatherCodeInfo } from '@/model/weather/WeatherCode';
import { WeatherDaily } from '@/model/weather/WeatherTypes';

interface Props {
  daily: WeatherDaily[];
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

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

      <Ionicons name={info.icon} size={22} color={Liquid.ink} />

      <View style={styles.descCol}>
        <PretendardText style={styles.descText}>{info.ko}</PretendardText>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons
              name='water-outline'
              size={12}
              color={Liquid.inkTertiary}
            />
            <PretendardText style={styles.metaText}>
              {precipText}
            </PretendardText>
          </View>
          {windText && (
            <PretendardText style={styles.metaText}>{windText}</PretendardText>
          )}
        </View>
      </View>

      <View style={styles.tempCol}>
        <PretendardText style={styles.tempMaxText} weight='semibold'>
          ↑{Math.round(item.tempMax)}°
        </PretendardText>
        <PretendardText style={styles.tempMinText}>
          ↓{Math.round(item.tempMin)}°
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
  // 행 사이는 헤어라인 하나로만 나눈다 — 구획은 면이 맡고 선은 최소로 둔다.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Liquid.hairline,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  dateCol: {
    width: 44,
    alignItems: 'center',
  },
  dateText: {
    fontSize: LiquidType.body.fontSize,
    lineHeight: LiquidType.body.lineHeight,
    color: Liquid.ink,
  },
  weekdayText: {
    fontSize: 12,
    color: Liquid.inkMuted,
  },
  descCol: {
    flex: 1,
    gap: 2,
  },
  descText: {
    fontSize: 14,
    color: Liquid.ink,
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
    color: Liquid.inkTertiary,
  },
  tempCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tempMinText: {
    fontSize: 14,
    color: Liquid.inkTertiary,
  },
  tempMaxText: {
    fontSize: LiquidType.body.fontSize,
    lineHeight: LiquidType.body.lineHeight,
    color: Liquid.ink,
  },
});

export default WeatherDailyView;
