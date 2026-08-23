import { Ionicons } from '@expo/vector-icons';
import { WeatherDaily } from './WeatherTypes';
import app from '@/model/app/App';

type IoniconName = keyof typeof Ionicons.glyphMap;

export interface WeatherCodeInfo {
  label: string;
  icon: IoniconName;
}

// WMO weather interpretation codes → 한글 설명 + Ionicons 아이콘.
// https://open-meteo.com/en/docs (weather_code)
const TABLE: Record<number, WeatherCodeInfo> = {
  0: { label: 'weather.code.0', icon: 'sunny-outline' },
  1: { label: 'weather.code.1', icon: 'partly-sunny-outline' },
  2: { label: 'weather.code.2', icon: 'partly-sunny-outline' },
  3: { label: 'weather.code.3', icon: 'cloudy-outline' },
  45: { label: 'weather.code.45', icon: 'cloudy-outline' },
  48: { label: 'weather.code.48', icon: 'cloudy-outline' },
  51: { label: 'weather.code.51', icon: 'rainy-outline' },
  53: { label: 'weather.code.53', icon: 'rainy-outline' },
  55: { label: 'weather.code.55', icon: 'rainy-outline' },
  56: { label: 'weather.code.56', icon: 'rainy-outline' },
  57: { label: 'weather.code.57', icon: 'rainy-outline' },
  61: { label: 'weather.code.61', icon: 'rainy-outline' },
  63: { label: 'weather.code.63', icon: 'rainy-outline' },
  65: { label: 'weather.code.65', icon: 'rainy-outline' },
  66: { label: 'weather.code.66', icon: 'rainy-outline' },
  67: { label: 'weather.code.67', icon: 'rainy-outline' },
  71: { label: 'weather.code.71', icon: 'snow-outline' },
  73: { label: 'weather.code.73', icon: 'snow-outline' },
  75: { label: 'weather.code.75', icon: 'snow-outline' },
  77: { label: 'weather.code.77', icon: 'snow-outline' },
  80: { label: 'weather.code.80', icon: 'rainy-outline' },
  81: { label: 'weather.code.81', icon: 'rainy-outline' },
  82: { label: 'weather.code.82', icon: 'rainy-outline' },
  85: { label: 'weather.code.85', icon: 'snow-outline' },
  86: { label: 'weather.code.86', icon: 'snow-outline' },
  95: { label: 'weather.code.95', icon: 'thunderstorm-outline' },
  96: { label: 'weather.code.96', icon: 'thunderstorm-outline' },
  99: { label: 'weather.code.99', icon: 'thunderstorm-outline' },
};

const FALLBACK: WeatherCodeInfo = { label: 'weather.code.unknown', icon: 'help-outline' };

export const getWeatherCodeInfo = (code: number): WeatherCodeInfo => {
  const info = TABLE[code] ?? FALLBACK;

  return { ...info, label: app.getL10n().t(info.label) };
};

// 비/눈 판정용 WMO 코드.
const RAIN_CODES = new Set([
  51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99,
]);
const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]);

export interface WeatherPeriodSummary {
  high: number; // 기간 최고기온(반올림)
  low: number; // 기간 최저기온(반올림)
  cond: string; // 대표 상태 문구(눈>비>맑음)
  icon: IoniconName; // 대표 아이콘(cond와 동일 우선순위)
  maxGust: number | null; // 기간 중 최대 돌풍(m/s)
  // 강수(눈/비) 여부 — 표시 문구(cond)에 결합하지 않고 조건 분기에 쓴다.
  hasPrecip: boolean;
}

/**
 * 여행 기간 전체를 한 줄로 요약한다. 카드/상세 요약이 같은 규칙(눈>비>맑음)을 쓰도록 공유.
 */
export const summarizeWeatherPeriod = (
  daily: WeatherDaily[]
): WeatherPeriodSummary | null => {
  if (!daily || daily.length === 0) {
    return null;
  }
  const high = Math.round(Math.max(...daily.map(d => d.tempMax)));
  const low = Math.round(Math.min(...daily.map(d => d.tempMin)));
  const hasSnow = daily.some(d => SNOW_CODES.has(d.code));
  const hasRain = daily.some(
    d => RAIN_CODES.has(d.code) || (d.precipProb ?? 0) >= 60
  );
  const cond = hasSnow
    ? app.getL10n().t('weather.conditionSnow')
    : hasRain
      ? app.getL10n().t('weather.conditionRain')
      : app.getL10n().t('weather.conditionSunny');
  const icon: IoniconName = hasSnow
    ? 'snow-outline'
    : hasRain
      ? 'rainy-outline'
      : 'partly-sunny-outline';
  const gusts = daily
    .map(d => d.windGustMax)
    .filter((v): v is number => v != null);
  const maxGust = gusts.length ? Math.round(Math.max(...gusts)) : null;
  return { high, low, cond, icon, maxGust, hasPrecip: hasSnow || hasRain };
};
