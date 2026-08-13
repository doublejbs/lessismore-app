import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { AcgType, Color } from '@/constants/DesignTokens';
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
            <PretendardText style={styles.metaText}>
              {precipText}
            </PretendardText>
          </View>
          {windText && (
            <PretendardText style={styles.metaText}>{windText}</PretendardText>
          )}
        </View>
      </View>

      {/* 최저 → 최고 가로 배치 — 홈 카드 예보(`비 23°/31°`)와 같은 순서로, 최고가 항상
          맨 오른쪽에 온다(2026-08-13 사용자 결정). */}
      <View style={styles.tempCol}>
        <PretendardText style={styles.tempMinText}>
          ↓{Math.round(item.tempMin)}°
        </PretendardText>
        <PretendardText style={styles.tempMaxText} weight='semibold'>
          ↑{Math.round(item.tempMax)}°
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
    ...AcgType.sectionSubtitle,
    color: Color.textPrimary,
  },
  weekdayText: {
    ...AcgType.meta,
    color: Color.textSecondary,
  },
  descCol: {
    flex: 1,
    gap: 2,
  },
  descText: {
    ...AcgType.rowSubtitle,
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
    ...AcgType.meta,
    color: Color.textSecondary,
  },
  tempCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tempMinText: {
    ...AcgType.rowSubtitle,
    color: Color.textSecondary,
  },
  tempMaxText: {
    ...AcgType.sectionSubtitle,
    color: Color.textPrimary,
  },
});

export default WeatherDailyView;
