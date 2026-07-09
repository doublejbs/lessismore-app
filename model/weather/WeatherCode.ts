import { Ionicons } from '@expo/vector-icons';

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
