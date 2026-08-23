import dayjs from 'dayjs';
import BagItem from './BagItem';
import app from '@/model/app/App';

/**
 * 배낭 목록의 구간(BAG-1). 목록은 여행마다 하나씩 쌓이는 축적형이라, 정렬 하나로는
 * "지금 가 있는 여행"과 "다음에 갈 여행"이 지난 기록 사이에 묻힌다.
 *
 * 판정은 배낭 상세(`BagDetail.getTripPhase`)와 같은 기준이다 — 두 화면이 같은 배낭을
 * 다르게 부르면 안 된다.
 */
enum BagTripSection {
  Ongoing = 'ongoing',
  Upcoming = 'upcoming',
  Past = 'past',
}

export const BAG_TRIP_SECTION_LABEL: Record<BagTripSection, string> = {
  [BagTripSection.Ongoing]: 'bagTrip.ongoing',
  [BagTripSection.Upcoming]: 'bagTrip.upcoming',
  [BagTripSection.Past]: 'bagTrip.past',
};

// 화면에 쌓는 차례. `여행 중`이 가장 급하고 `지난`이 회고다.
export const BAG_TRIP_SECTION_ORDER: BagTripSection[] = [
  BagTripSection.Ongoing,
  BagTripSection.Upcoming,
  BagTripSection.Past,
];

/**
 * 배낭 하나의 구간을 판정한다.
 *
 * 종료일이 없으면 시작일로 보고, 둘 다 없으면 `지난`으로 둔다 — 날짜 없는 레거시 배낭이
 * 목록 상단을 차지하면 정작 다음 여행이 밀린다.
 */
export const getBagTripSection = (
  bagItem: BagItem,
  today = dayjs()
): BagTripSection => {
  const startValue = bagItem.getStartDateValue();
  const endValue = bagItem.getEndDateValue();

  if (startValue === null && endValue === null) {
    return BagTripSection.Past;
  }

  const startOfToday = today.startOf('day');
  const end = dayjs(endValue ?? startValue).startOf('day');

  if (end.isBefore(startOfToday)) {
    return BagTripSection.Past;
  }

  const start = dayjs(startValue ?? endValue).startOf('day');

  if (start.isAfter(startOfToday)) {
    return BagTripSection.Upcoming;
  }

  return BagTripSection.Ongoing;
};

export interface BagTripGroup {
  section: BagTripSection;
  label: string;
  bags: BagItem[];
}

/**
 * 정렬된 목록을 구간별로 묶는다. **구간 안의 차례는 건드리지 않는다** — 정렬 선택(BAG-6)이
 * 그대로 유지돼야 한다. 빈 구간은 아예 내보내지 않아 호출측이 제목을 그리지 않는다.
 */
export const groupBagsByTripSection = (
  bags: BagItem[],
  today = dayjs()
): BagTripGroup[] => {
  const buckets = new Map<BagTripSection, BagItem[]>();

  bags.forEach(bagItem => {
    const section = getBagTripSection(bagItem, today);
    const bucket = buckets.get(section);

    if (bucket) {
      bucket.push(bagItem);

      return;
    }

    buckets.set(section, [bagItem]);
  });

  return BAG_TRIP_SECTION_ORDER.filter(section => buckets.has(section)).map(
    section => ({
      section,
      label: app.getL10n().t(BAG_TRIP_SECTION_LABEL[section]),
      bags: buckets.get(section) ?? [],
    })
  );
};

export default BagTripSection;
