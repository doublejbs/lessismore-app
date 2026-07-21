import dayjs from 'dayjs';
import HealthWorkoutType from './HealthWorkoutType';

// 운동 기록(HA)의 표시 문자열 변환. 도메인 값은 전 구간 SI(m/초)로 다루고
// 사람이 읽는 단위 변환은 여기 한 곳에서만 한다 — 타일 부제(HA-1)와
// 후보 목록·합산 요약(HA-3)이 같은 표기를 쓰게 하기 위함이다.

const METERS_PER_KILOMETER = 1000;
const GRAMS_PER_KILOGRAM = 1000;
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;

const WORKOUT_TYPE_LABELS: Record<HealthWorkoutType, string> = {
  [HealthWorkoutType.Hiking]: '하이킹',
  [HealthWorkoutType.Walking]: '걷기',
  [HealthWorkoutType.Running]: '달리기',
  [HealthWorkoutType.Cycling]: '자전거',
  [HealthWorkoutType.Other]: '운동',
};

export const getWorkoutTypeLabel = (type: HealthWorkoutType): string => {
  return WORKOUT_TYPE_LABELS[type];
};

/** 거리(m) → `12.4km`. */
export const formatDistance = (meters: number): string => {
  return `${(meters / METERS_PER_KILOMETER).toFixed(1)}km`;
};

/** 상승고도(m) → `850m↑`. 소수점은 의미가 없어 반올림한다. */
export const formatElevation = (meters: number): string => {
  return `${Math.round(meters)}m↑`;
};

/** 소요 시간(초) → `3시간 20분` / `45분`. 1분 미만은 `1분 미만`. */
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / SECONDS_PER_HOUR);
  const minutes = Math.floor((seconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);

  if (hours > 0) {
    return minutes > 0 ? `${hours}시간 ${minutes}분` : `${hours}시간`;
  }

  if (minutes > 0) {
    return `${minutes}분`;
  }

  return '1분 미만';
};

/** 활동 에너지(kcal) → `420kcal`. */
export const formatEnergy = (kilocalories: number): string => {
  return `${Math.round(kilocalories)}kcal`;
};

/**
 * 배낭 무게(g) → `8.4kg`(HA-4).
 *
 * `bag.weight`는 그램 단위 정수다. 배낭 상세(BD-3)와 같은 소수 첫째 자리 표기를 쓴다.
 */
export const formatBagWeight = (grams: number): string => {
  return `${(grams / GRAMS_PER_KILOGRAM).toFixed(1)}kg`;
};

/** 심박(bpm) → `132bpm`. */
export const formatHeartRate = (beatsPerMinute: number): string => {
  return `${Math.round(beatsPerMinute)}bpm`;
};

/** 페이스(분/km) → `12'30"/km`. 초는 반올림 후 60초로 올라가면 분으로 넘긴다. */
export const formatPace = (minutesPerKilometer: number): string => {
  const totalSeconds = Math.round(minutesPerKilometer * SECONDS_PER_MINUTE);
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;

  return `${minutes}'${seconds.toString().padStart(2, '0')}"/km`;
};

/** 그래프 x축 라벨용 시각 → `14:05`. */
export const formatClockTime = (date: Date): string => {
  return dayjs(date).format('HH:mm');
};

// dayjs 한국어 로케일을 등록하지 않은 저장소라 요일 토큰(ddd)은 영문으로 나온다.
// 후보 구분에는 날짜·시각이면 충분하므로 요일을 쓰지 않는다.
export const formatWorkoutStartedAt = (startDate: Date): string => {
  return dayjs(startDate).format('M월 D일 HH:mm');
};
