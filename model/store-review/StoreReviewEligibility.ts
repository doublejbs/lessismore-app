import dayjs, { Dayjs } from 'dayjs';
import BagItem from '@/model/bag/BagItem';
import HomeTripStage from '@/model/home/HomeTripStage';
import { getTripStage } from '@/model/home/HomeTripPlan';

/**
 * APP-11 앱 평가 요청의 판정부. **순수 함수다** — `today`를 인자로 받아 날짜를 고정해 검증할 수 있게 한다
 * (HomeTripPlan과 같은 방식).
 */

// 마지막 요청 뒤 이 기간이 지나야 다시 요청한다(APP-11 빈도).
export const STORE_REVIEW_INTERVAL_DAYS = 90;

// 기기 로컬에 남기는 요청 기록(APP-11 빈도).
export interface StoreReviewRecord {
  // 이미 요청한 배낭 id — 같은 배낭으로는 한 번만 요청한다.
  requestedBagIds: string[];
  // 마지막 요청 시각(ms). 요청한 적 없으면 null.
  lastRequestedAt: number | null;
}

export const EMPTY_STORE_REVIEW_RECORD: StoreReviewRecord = {
  requestedBagIds: [],
  lastRequestedAt: null,
};

// 마지막 요청 뒤 90일이 지났는지(요청한 적 없으면 true).
export const isIntervalElapsed = (
  record: StoreReviewRecord,
  today: Dayjs = dayjs()
): boolean => {
  if (record.lastRequestedAt === null) {
    return true;
  }

  return (
    today.diff(dayjs(record.lastRequestedAt), 'day') >=
    STORE_REVIEW_INTERVAL_DAYS
  );
};

/**
 * 평가를 요청할 배낭 id를 고른다. 요청하지 않아야 하면 null.
 *
 * 대상은 종료 후 1~7일(HM-1 `JustFinished`)이면서 아직 요청하지 않은 배낭이다.
 */
export const selectStoreReviewBagId = (
  bags: BagItem[],
  record: StoreReviewRecord,
  today: Dayjs = dayjs()
): string | null => {
  if (!isIntervalElapsed(record, today)) {
    return null;
  }

  const candidate = bags.find(
    bag =>
      getTripStage(bag, today) === HomeTripStage.JustFinished &&
      !record.requestedBagIds.includes(bag.getID())
  );

  return candidate ? candidate.getID() : null;
};

// 요청 뒤 기록을 갱신한다(기존 기록은 바꾸지 않고 새로 만든다).
export const appendStoreReviewRequest = (
  record: StoreReviewRecord,
  bagId: string,
  now: number
): StoreReviewRecord => ({
  requestedBagIds: [...record.requestedBagIds, bagId],
  lastRequestedAt: now,
});
