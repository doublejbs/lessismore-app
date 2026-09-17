import dayjs from 'dayjs';
import app from '@/model/app/App';

/**
 * 배낭 스냅샷 표기의 단일 소스.
 *
 * 커뮤니티 패킹 스냅샷(CM-4)과 그룹 일행 배낭(GRP-5)은 같은 값을 같은 자릿수로 적어야 한다 —
 * 두 화면이 각자 포맷을 들고 있으면 같은 배낭이 화면마다 다른 무게·기간으로 읽힌다.
 * l10n 키는 화면마다 다르므로 **문구가 아니라 형식만** 여기서 정한다(키는 인자로 받는다).
 */

const MINUTE_IN_MILLISECONDS = 60 * 1000;
const HOUR_IN_MILLISECONDS = 60 * MINUTE_IN_MILLISECONDS;
const DAY_IN_MILLISECONDS = 24 * HOUR_IN_MILLISECONDS;

// 상대 시각을 그만두는 지점에서 적는 절대 날짜. 숫자·구분점뿐이라 언어별로 갈리지 않는다.
const ABSOLUTE_DATE_FORMAT = 'YYYY.MM.DD';

// 기간 표기 형식. 로케일마다 다른 값이라 호출부가 l10n에서 읽어 넘긴다.
export interface BagSnapshotDateRangeFormat {
  readonly dateFormat: string;
  readonly separator: string;
}

// 상대 시각 문구의 l10n 키 묶음. 화면마다 네임스페이스가 달라 키로 받는다.
export interface BagSnapshotRelativeTimeKeys {
  readonly justNow: string;
  readonly minutesAgo: string;
  readonly hoursAgo: string;
  readonly daysAgo: string;
}

// 합계·배낭 무게는 kg 소수 첫째 자리까지.
export const formatBagSnapshotWeightInKilograms = (grams: number): string => {
  return (grams / 1000).toFixed(1);
};

export const formatBagSnapshotWeightInGrams = (grams: number): string => {
  return Math.round(grams).toLocaleString('en-US');
};

/**
 * 기간 표기. 저장 형식은 `YYYY-MM-DD`이고 표기는 로케일 형식을 따른다.
 * 하루짜리 여행(시작일 = 종료일)은 한 번만 적는다.
 */
export const formatBagSnapshotDateRange = (
  startDate: string | undefined,
  endDate: string | undefined,
  format: BagSnapshotDateRangeFormat
): string => {
  const start = startDate ? dayjs(startDate).format(format.dateFormat) : '';
  const end = endDate ? dayjs(endDate).format(format.dateFormat) : '';

  if (start && start === end) {
    return start;
  }

  return [start, end].filter(Boolean).join(format.separator);
};

/**
 * 상대 시각 문구. `maxRelativeDays`를 넘기면 그 일수부터는 절대 날짜로 적는다 —
 * 넘기지 않으면 며칠이 지나도 `N일 전`으로 남는다(동기화 시각처럼 최신성이 중요한 값).
 */
export const formatBagSnapshotRelativeTime = (
  date: Date,
  keys: BagSnapshotRelativeTimeKeys,
  maxRelativeDays?: number
): string => {
  const l10n = app.getL10n();
  const elapsed = Math.max(0, Date.now() - date.getTime());

  if (elapsed < MINUTE_IN_MILLISECONDS) {
    return l10n.t(keys.justNow);
  }

  if (elapsed < HOUR_IN_MILLISECONDS) {
    return l10n.t(keys.minutesAgo, {
      count: Math.floor(elapsed / MINUTE_IN_MILLISECONDS),
    });
  }

  if (elapsed < DAY_IN_MILLISECONDS) {
    return l10n.t(keys.hoursAgo, {
      count: Math.floor(elapsed / HOUR_IN_MILLISECONDS),
    });
  }

  if (
    maxRelativeDays !== undefined &&
    elapsed >= maxRelativeDays * DAY_IN_MILLISECONDS
  ) {
    return dayjs(date).format(ABSOLUTE_DATE_FORMAT);
  }

  return l10n.t(keys.daysAgo, {
    count: Math.floor(elapsed / DAY_IN_MILLISECONDS),
  });
};
