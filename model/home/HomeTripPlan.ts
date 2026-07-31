import dayjs, { Dayjs } from 'dayjs';
import BagItem from '@/model/bag/BagItem';
import HomeTripStage from '@/model/home/HomeTripStage';

/**
 * HM-1 다가오는 일정의 계산부. **전부 순수 함수다** — `today`를 인자로 받아
 * 테스트에서 날짜를 고정할 수 있게 한다(자정 경계·D-day 분기가 이 모듈의 전부라
 * 시각에 의존하면 검증할 방법이 없다).
 */

// 종료 후 이 기간까지는 "사용 기록하기"를 권한다. 그 뒤로는 홈에서 내린다.
const JUST_FINISHED_DAYS = 7;

export interface HomeTripAction {
  label: string;
  route: string;
}

export interface HomeTripPlan {
  // 주 카드에 세울 배낭. 없으면 빈 상태를 그린다.
  primary: BagItem | null;
  stage: HomeTripStage | null;
  // 주 카드 아래 한 줄 요약(최대 2개).
  next: BagItem[];
}

// 주 카드 아래 덧붙이는 다음 일정 개수.
const NEXT_LIMIT = 2;

/**
 * 배낭의 시점을 가른다. 판단 불가(날짜 없음)거나 홈에 세울 이유가 없으면 null.
 *
 * 날짜 비교는 **일 단위**로 한다 — 출발 당일 오전에 열었는데 시작 시각이 지났다고
 * "여행 중"으로 넘어가면 패킹 진입점을 잃는다.
 */
export const getTripStage = (
  bag: BagItem,
  today: Dayjs = dayjs()
): HomeTripStage | null => {
  const startValue = bag.getStartDateValue();
  const endValue = bag.getEndDateValue();

  if (startValue === null || endValue === null) {
    return null;
  }

  const start = dayjs(startValue).startOf('day');
  const end = dayjs(endValue).startOf('day');
  const base = today.startOf('day');
  const daysUntilStart = start.diff(base, 'day');

  if (daysUntilStart >= 2) {
    return HomeTripStage.Planning;
  }

  if (daysUntilStart >= 0) {
    return HomeTripStage.Imminent;
  }

  // 시작일은 지났다 — 종료일로 여행 중/종료 후를 가른다.
  if (!end.isBefore(base, 'day')) {
    return HomeTripStage.Ongoing;
  }

  return base.diff(end, 'day') <= JUST_FINISHED_DAYS
    ? HomeTripStage.JustFinished
    : null;
};

/**
 * D-day 라벨. 표시 문자열이라 시점 enum과 별개로 계산한다 —
 * `Planning`이어도 D-3과 D-9는 다르게 보여야 한다.
 */
export const getDDayLabel = (
  bag: BagItem,
  today: Dayjs = dayjs()
): string | null => {
  const stage = getTripStage(bag, today);

  if (stage === null) {
    return null;
  }

  if (stage === HomeTripStage.Ongoing) {
    return '여행 중';
  }

  if (stage === HomeTripStage.JustFinished) {
    return '여행 완료';
  }

  const startValue = bag.getStartDateValue();

  if (startValue === null) {
    return null;
  }

  const daysUntilStart = dayjs(startValue)
    .startOf('day')
    .diff(today.startOf('day'), 'day');

  return daysUntilStart === 0 ? '오늘 출발' : `D-${daysUntilStart}`;
};

/**
 * 시점별 주 액션(HM-1). **알림(NT-2/NT-3)이 유도하는 행동과 같은 목적지여야 한다** —
 * 알림을 놓쳐도 홈에서 같은 할 일에 닿는 것이 이 카드의 존재 이유다.
 */
export const getPrimaryAction = (
  bag: BagItem,
  stage: HomeTripStage
): HomeTripAction => {
  const id = bag.getID();

  switch (stage) {
    case HomeTripStage.Planning: {
      return { label: '장비 담기', route: `/bag/${id}/edit` };
    }
    case HomeTripStage.Imminent: {
      return { label: '패킹 시작', route: `/bag/${id}/packing` };
    }
    case HomeTripStage.Ongoing: {
      return { label: '패킹 확인', route: `/bag/${id}/packing` };
    }
    case HomeTripStage.JustFinished: {
      return { label: '사용 기록하기', route: `/useless/${id}` };
    }
  }
};

// 여행 중 > 임박 > 계획 > 종료 직후 순. 같은 등급이면 시작일이 가까운 쪽이 앞선다.
const STAGE_PRIORITY: Record<HomeTripStage, number> = {
  [HomeTripStage.Ongoing]: 0,
  [HomeTripStage.Imminent]: 1,
  [HomeTripStage.Planning]: 2,
  [HomeTripStage.JustFinished]: 3,
};

/**
 * 홈에 세울 배낭을 고른다.
 *
 * 여행 중인 배낭이 있으면 그것이 우선이고, 없으면 가장 가까운 예정이다.
 * 예정도 없으면 최근에 끝난 여행(기록 유도)까지 본다.
 */
export const selectTripPlan = (
  bags: BagItem[],
  today: Dayjs = dayjs()
): HomeTripPlan => {
  const staged = bags
    .map(bag => ({ bag, stage: getTripStage(bag, today) }))
    .filter(
      (entry): entry is { bag: BagItem; stage: HomeTripStage } =>
        entry.stage !== null
    )
    .sort((a, b) => {
      const byStage = STAGE_PRIORITY[a.stage] - STAGE_PRIORITY[b.stage];

      if (byStage !== 0) {
        return byStage;
      }

      return (a.bag.getStartDateValue() ?? 0) - (b.bag.getStartDateValue() ?? 0);
    });

  const head = staged[0];

  if (!head) {
    return { primary: null, stage: null, next: [] };
  }

  // 아래 한 줄 요약은 **앞으로 갈 여행만** 담는다 — 이미 끝난 여행을 "다음 일정"으로
  // 세우면 목록의 뜻이 흐려진다.
  const next = staged
    .slice(1)
    .filter(entry => entry.stage !== HomeTripStage.JustFinished)
    .slice(0, NEXT_LIMIT)
    .map(entry => entry.bag);

  return { primary: head.bag, stage: head.stage, next };
};
