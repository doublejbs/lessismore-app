import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import { AcgType, Color } from '@/constants/DesignTokens';
import { getWeatherCodeInfo } from '@/model/weather/WeatherCode';
import { WeatherDaily } from '@/model/weather/WeatherTypes';
import app from '@/model/app/App';

interface Props {
  daily: WeatherDaily[];
}

const WeatherDailyRow: FC<{ item: WeatherDaily; isLast: boolean }> = ({
  item,
  isLast,
}) => {
  const l10n = app.getL10n();
  const info = getWeatherCodeInfo(item.code);
  const d = dayjs(item.date);
  const weekdays = l10n.t('weather.weekdays', {
    returnObjects: true,
  }) as unknown as string[];
  const weekday = weekdays[d.day()];
  const precipText =
    item.precipProb != null
      ? `${item.precipProb}%`
      : item.precipSum != null
        ? `${item.precipSum}mm`
        : '-';
  const windText = item.windSpeedMax != null
    ? `${l10n.t('weather.wind', { speed: Math.round(item.windSpeedMax) })}${
        item.windGustMax != null
          ? ` · ${l10n.t('weather.gust', { speed: Math.round(item.windGustMax) })}`
          : ''
      }`
    : null;

  return (
    <View style={[styles.row, isLast && styles.rowLast]}>
      <View style={styles.dateCol}>
        <PretendardText style={styles.dateText} weight='semibold'>
          {d.format(l10n.t('weather.dayFormat'))}
        </PretendardText>
        <PretendardText style={styles.weekdayText}>{weekday}</PretendardText>
      </View>

      <Ionicons name={info.icon} size={22} color={Color.textPrimary} />

      <View style={styles.descCol}>
        <PretendardText style={styles.descText}>{info.label}</PretendardText>
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
  // 행 자체 좌우 패딩은 없다(2026-08-13) — 화면 패딩 위에 4를 더 얹어 다른 콘텐츠와
  // 정렬선이 어긋나던 잔재를 걷었다(패킹·정보 탭과 같은 계열).
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Color.borderLight,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  // 날짜는 왼쪽 정렬(2026-08-13 사용자 지적) — 가운데 정렬이면 글자가 컬럼 안에서
  // 8pt쯤 밀려 들어가 정렬선(24)에서 떠 보인다. 폭은 아이콘 열 정렬을 위해 고정 유지.
  dateCol: {
    width: 44,
    alignItems: 'flex-start',
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

export default observer(WeatherDailyView);
