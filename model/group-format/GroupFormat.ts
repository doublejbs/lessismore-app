import app from '@/model/app/App';
import { GROUP_DAY_IN_MILLISECONDS } from '@/model/group/GroupLimits';

const MINUTE_IN_MILLISECONDS = 60 * 1000;
const HOUR_IN_MILLISECONDS = 60 * MINUTE_IN_MILLISECONDS;

/**
 * 그룹 기간 표기 (GRP-1·GRP-4). 저장 형식은 `YYYY-MM-DD`이고 화면 표기는 `YYYY.MM.DD`다.
 * 하루짜리 여행(시작일 = 종료일)은 한 번만 적는다.
 */
export const formatGroupDateRange = (
  startDate: string,
  endDate: string
): string => {
  const start = startDate.replaceAll('-', '.');
  const end = endDate.replaceAll('-', '.');

  if (!start && !end) {
    return '';
  }

  if (start === end) {
    return start;
  }

  return [start, end]
    .filter(Boolean)
    .join(app.getL10n().t('group.detail.dateRangeSeparator'));
};

// 합계·배낭 무게는 kg 소수 첫째 자리까지 — 커뮤니티 스냅샷과 같은 자릿수다.
export const formatGroupWeight = (grams: number): string => {
  return (grams / 1000).toFixed(1);
};

export const formatGroupWeightInGrams = (grams: number): string => {
  return Math.round(grams).toLocaleString('en-US');
};

/**
 * 스냅샷 신선도 문구 (GRP-5). 스냅샷은 실시간 구독이 아니라 쓰기 시점 동기화라
 * "언제 기준 값인지"를 밝혀야 일행이 낡은 구성을 최신으로 오해하지 않는다.
 */
export const getGroupSyncedAtText = (date: Date): string => {
  const l10n = app.getL10n();
  const elapsed = Math.max(0, Date.now() - date.getTime());

  if (elapsed < MINUTE_IN_MILLISECONDS) {
    return l10n.t('group.member.syncedJustNow');
  }

  if (elapsed < HOUR_IN_MILLISECONDS) {
    return l10n.t('group.member.syncedMinutesAgo', {
      count: Math.floor(elapsed / MINUTE_IN_MILLISECONDS),
    });
  }

  if (elapsed < GROUP_DAY_IN_MILLISECONDS) {
    return l10n.t('group.member.syncedHoursAgo', {
      count: Math.floor(elapsed / HOUR_IN_MILLISECONDS),
    });
  }

  return l10n.t('group.member.syncedDaysAgo', {
    count: Math.floor(elapsed / GROUP_DAY_IN_MILLISECONDS),
  });
};
