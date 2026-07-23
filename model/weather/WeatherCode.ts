import { Ionicons } from '@expo/vector-icons';
import { WeatherDaily } from './WeatherTypes';

type IoniconName = keyof typeof Ionicons.glyphMap;

export interface WeatherCodeInfo {
  ko: string;
  icon: IoniconName;
}

// WMO weather interpretation codes → 한글 설명 + Ionicons 아이콘.
// https://open-meteo.com/en/docs (weather_code)
const TABLE: Record<number, WeatherCodeInfo> = {
  0: { ko: '맑음', icon: 'sunny-outline' },
  1: { ko: '대체로 맑음', icon: 'partly-sunny-outline' },
  2: { ko: '구름 조금', icon: 'partly-sunny-outline' },
  3: { ko: '흐림', icon: 'cloudy-outline' },
  45: { ko: '안개', icon: 'cloudy-outline' },
  48: { ko: '서리 안개', icon: 'cloudy-outline' },
  51: { ko: '약한 이슬비', icon: 'rainy-outline' },
  53: { ko: '이슬비', icon: 'rainy-outline' },
  55: { ko: '강한 이슬비', icon: 'rainy-outline' },
  56: { ko: '어는 이슬비', icon: 'rainy-outline' },
  57: { ko: '강한 어는 이슬비', icon: 'rainy-outline' },
  61: { ko: '약한 비', icon: 'rainy-outline' },
  63: { ko: '비', icon: 'rainy-outline' },
  65: { ko: '강한 비', icon: 'rainy-outline' },
  66: { ko: '어는 비', icon: 'rainy-outline' },
  67: { ko: '강한 어는 비', icon: 'rainy-outline' },
  71: { ko: '약한 눈', icon: 'snow-outline' },
  73: { ko: '눈', icon: 'snow-outline' },
  75: { ko: '강한 눈', icon: 'snow-outline' },
  77: { ko: '싸락눈', icon: 'snow-outline' },
  80: { ko: '약한 소나기', icon: 'rainy-outline' },
  81: { ko: '소나기', icon: 'rainy-outline' },
  82: { ko: '강한 소나기', icon: 'rainy-outline' },
  85: { ko: '약한 소낙눈', icon: 'snow-outline' },
  86: { ko: '강한 소낙눈', icon: 'snow-outline' },
  95: { ko: '뇌우', icon: 'thunderstorm-outline' },
  96: { ko: '우박 동반 뇌우', icon: 'thunderstorm-outline' },
  99: { ko: '강한 우박 뇌우', icon: 'thunderstorm-outline' },
};

const FALLBACK: WeatherCodeInfo = { ko: '정보 없음', icon: 'help-outline' };

export const getWeatherCodeInfo = (code: number): WeatherCodeInfo =>
  TABLE[code] ?? FALLBACK;

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
  const cond = hasSnow ? '눈' : hasRain ? '비' : '맑음';
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
