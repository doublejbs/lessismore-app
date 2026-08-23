import dayjs, { Dayjs } from 'dayjs';
import {
  WeatherDaily,
  WeatherKind,
  WeatherLocation,
  WeatherSnapshot,
  WeatherSource,
} from './WeatherTypes';
import { getAppTranslation } from '../l10n/L10nRegistry';

// 날씨: Open-Meteo 무료 엔드포인트(키 없음).
// 지오코딩·장소 검색은 여행지 선택 책임이라 여기 없다(WT-6, `model/bag-destination/GeocodeService`).
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';

// 예보 API 커버 범위: [오늘-92일 ~ 오늘+15일]. 그 밖은 아카이브/평년값.
// Open-Meteo forecast는 오늘 포함 16일(=오늘+15일)까지만 허용한다 — 오늘+16을 요청하면
// "end_date out of allowed range" 400이 난다. 초과분(먼 미래)은 평년값 세그먼트가 담당한다.
const FORECAST_PAST_DAYS = 92;
const FORECAST_FUTURE_DAYS = 15;
// 평년값 계산에 사용할 과거 연도 수.
const NORMAL_YEARS = 5;

interface DailyRaw {
  time: string[];
  weather_code: number[];
  temperature_2m_max: (number | null)[];
  temperature_2m_min: (number | null)[];
  precipitation_probability_max?: (number | null)[];
  precipitation_sum?: (number | null)[];
  wind_speed_10m_max?: (number | null)[];
  wind_gusts_10m_max?: (number | null)[];
}

const fetchJson = async (url: string): Promise<any> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Open-Meteo 요청 실패: ${res.status}`); // l10n-ignore: 개발자 API 예외 메시지
  }
  const json = await res.json();
  if (json?.error) {
    throw new Error(json.reason ?? 'Open-Meteo 오류'); // l10n-ignore: 개발자 API 예외 메시지
  }
  return json;
};

const fmt = (d: Dayjs) => d.format('YYYY-MM-DD');

// forecast API: [오늘-92 ~ 오늘+16] 범위의 특정 구간을 일별로.
const fetchForecastRange = async (
  location: WeatherLocation,
  start: Dayjs,
  end: Dayjs
): Promise<WeatherDaily[]> => {
  const url =
    `${FORECAST_URL}?latitude=${location.latitude}&longitude=${location.longitude}` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max` +
    `&wind_speed_unit=ms&timezone=auto&start_date=${fmt(start)}&end_date=${fmt(end)}`;
  const json = await fetchJson(url);
  return toDaily(json.daily, 'forecast');
};

// archive API: 과거 실측.
const fetchArchiveRange = async (
  location: WeatherLocation,
  start: Dayjs,
  end: Dayjs
): Promise<WeatherDaily[]> => {
  const url =
    `${ARCHIVE_URL}?latitude=${location.latitude}&longitude=${location.longitude}` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max` +
    `&wind_speed_unit=ms&timezone=auto&start_date=${fmt(start)}&end_date=${fmt(end)}`;
  const json = await fetchJson(url);
  return toDaily(json.daily, 'archive');
};

// 응답 daily 블록 → WeatherDaily[]. 값이 null인 날은 건너뛴다.
const toDaily = (raw: DailyRaw | undefined, source: WeatherSource): WeatherDaily[] => {
  if (!raw?.time) {
    return [];
  }
  const out: WeatherDaily[] = [];
  for (let i = 0; i < raw.time.length; i++) {
    const tMax = raw.temperature_2m_max?.[i];
    const tMin = raw.temperature_2m_min?.[i];
    if (tMax == null || tMin == null) {
      continue;
    }
    const prob = raw.precipitation_probability_max?.[i];
    const sum = raw.precipitation_sum?.[i];
    const wind = raw.wind_speed_10m_max?.[i];
    const gust = raw.wind_gusts_10m_max?.[i];
    out.push({
      date: raw.time[i],
      code: raw.weather_code?.[i] ?? 0,
      tempMax: tMax,
      tempMin: tMin,
      source,
      ...(prob != null ? { precipProb: prob } : {}),
      ...(sum != null ? { precipSum: sum } : {}),
      ...(wind != null ? { windSpeedMax: wind } : {}),
      ...(gust != null ? { windGustMax: gust } : {}),
    });
  }
  return out;
};

// 먼 미래 구간의 평년값: 과거 NORMAL_YEARS년 같은 날짜의 아카이브 평균.
const computeNormals = async (
  location: WeatherLocation,
  start: Dayjs,
  end: Dayjs
): Promise<WeatherDaily[]> => {
  const days = end.diff(start, 'day') + 1;
  const thisYear = dayjs().year();

  const tMaxSum = new Array(days).fill(0);
  const tMinSum = new Array(days).fill(0);
  const precipSum = new Array(days).fill(0);
  const windSum = new Array(days).fill(0);
  const windCount = new Array(days).fill(0);
  const gustSum = new Array(days).fill(0);
  const gustCount = new Array(days).fill(0);
  const rainCount = new Array(days).fill(0);
  const validCount = new Array(days).fill(0);

  for (let y = 1; y <= NORMAL_YEARS; y++) {
    const histStart = dayjs(`${thisYear - y}-${start.format('MM-DD')}`);
    if (!histStart.isValid()) {
      continue;
    }
    const histEnd = histStart.add(days - 1, 'day');
    let daily: WeatherDaily[];
    try {
      const url =
        `${ARCHIVE_URL}?latitude=${location.latitude}&longitude=${location.longitude}` +
        `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max` +
        `&wind_speed_unit=ms&timezone=auto&start_date=${fmt(histStart)}&end_date=${fmt(histEnd)}`;
      const json = await fetchJson(url);
      daily = toDaily(json.daily, 'normal');
    } catch {
      continue; // 특정 연도 실패는 무시하고 나머지로 평균
    }
    daily.forEach((d, i) => {
      if (i >= days) {
        return;
      }
      tMaxSum[i] += d.tempMax;
      tMinSum[i] += d.tempMin;
      const p = d.precipSum ?? 0;
      precipSum[i] += p;
      if (p >= 1) {
        rainCount[i] += 1;
      }
      if (d.windSpeedMax != null) {
        windSum[i] += d.windSpeedMax;
        windCount[i] += 1;
      }
      if (d.windGustMax != null) {
        gustSum[i] += d.windGustMax;
        gustCount[i] += 1;
      }
      validCount[i] += 1;
    });
  }

  const out: WeatherDaily[] = [];
  for (let i = 0; i < days; i++) {
    if (validCount[i] === 0) {
      continue;
    }
    const avgPrecip = precipSum[i] / validCount[i];
    const rainRatio = rainCount[i] / validCount[i];
    // 평년값은 개별 weather_code 평균이 무의미하므로 강수 경향으로 대표 코드를 정한다.
    const code = rainRatio >= 0.5 ? 63 : avgPrecip > 0.3 ? 61 : 1;
    out.push({
      date: start.add(i, 'day').format('YYYY-MM-DD'),
      code,
      tempMax: Math.round((tMaxSum[i] / validCount[i]) * 10) / 10,
      tempMin: Math.round((tMinSum[i] / validCount[i]) * 10) / 10,
      source: 'normal',
      precipSum: Math.round(avgPrecip * 10) / 10,
      ...(windCount[i] > 0
        ? { windSpeedMax: Math.round((windSum[i] / windCount[i]) * 10) / 10 }
        : {}),
      ...(gustCount[i] > 0
        ? { windGustMax: Math.round((gustSum[i] / gustCount[i]) * 10) / 10 }
        : {}),
    });
  }
  return out;
};

/**
 * 여행 기간 [start, end]의 날씨 스냅샷을 만든다.
 * 오늘 기준으로 과거(아카이브)/근접(예보)/먼미래(평년값) 구간으로 나눠 각각 조회 후 병합한다.
 * `frozen`은 여행이 완전히 과거일 때 true.
 */
const getWeather = async (
  location: WeatherLocation,
  start: Dayjs,
  end: Dayjs
): Promise<WeatherSnapshot> => {
  const today = dayjs().startOf('day');
  const s = start.startOf('day');
  const e = end.startOf('day');
  const forecastLow = today.subtract(FORECAST_PAST_DAYS, 'day');
  const forecastHigh = today.add(FORECAST_FUTURE_DAYS, 'day');

  const segments: Promise<WeatherDaily[]>[] = [];
  const kinds = new Set<WeatherSource>();

  // 과거(예보 범위보다 이전) → 아카이브
  if (s.isBefore(forecastLow)) {
    const aEnd = e.isBefore(forecastLow) ? e : forecastLow.subtract(1, 'day');
    segments.push(fetchArchiveRange(location, s, aEnd));
    kinds.add('archive');
  }
  // 예보 범위와 겹치는 구간 → 예보 API
  const fStart = s.isAfter(forecastLow) ? s : forecastLow;
  const fEnd = e.isBefore(forecastHigh) ? e : forecastHigh;
  if (!fStart.isAfter(fEnd) && !fEnd.isBefore(forecastLow) && !fStart.isAfter(forecastHigh)) {
    segments.push(fetchForecastRange(location, fStart, fEnd));
    kinds.add('forecast');
  }
  // 먼 미래 → 평년값
  if (e.isAfter(forecastHigh)) {
    const nStart = s.isAfter(forecastHigh) ? s : forecastHigh.add(1, 'day');
    segments.push(computeNormals(location, nStart, e));
    kinds.add('normal');
  }

  const results = await Promise.all(segments);
  const daily = results
    .flat()
    .sort((a, b) => a.date.localeCompare(b.date));

  if (daily.length === 0) {
    throw new Error(getAppTranslation('weather.loadFailed'));
  }

  const kind: WeatherKind = kinds.size === 1 ? [...kinds][0] : 'mixed';

  return {
    fetchedAt: new Date().toISOString(),
    kind,
    frozen: e.isBefore(today),
    latitude: location.latitude,
    longitude: location.longitude,
    locationName: location.name,
    daily,
  };
};

const weatherService = { getWeather };

export default weatherService;
