import dayjs, { Dayjs } from 'dayjs';
import BagItem from '@/model/bag/BagItem';

/**
 * 끝난 여행인지(CM-16 "끝난 여행만") — `endDate`가 오늘 이전이다.
 * 날짜가 없는 레거시 배낭은 끝났는지 알 수 없어 기록 대상이 아니다.
 */
export const isTripEnded = (
  endDate: Dayjs | null,
  today: Dayjs = dayjs()
): boolean => {
  if (!endDate || !endDate.isValid()) {
    return false;
  }

  return endDate.startOf('day').isBefore(today.startOf('day'));
};

/**
 * 기록이 없는 끝난 여행 중 가장 최근에 끝난 것(HM-17 `내 여행 기록하기`). 없으면 null.
 */
export const findLatestUnrecordedTrip = (
  bags: BagItem[],
  recordedBagIds: Set<string>,
  today: Dayjs = dayjs()
): BagItem | null => {
  const candidates = bags.filter(
    bag =>
      isTripEnded(bag.getTripEnd(), today) && !recordedBagIds.has(bag.getID())
  );

  if (candidates.length === 0) {
    return null;
  }

  return candidates.reduce((latest, bag) =>
    (bag.getEndDateValue() ?? 0) > (latest.getEndDateValue() ?? 0)
      ? bag
      : latest
  );
};
