import dayjs, { Dayjs } from 'dayjs';

// 재방문 리마인더(NT-7·NT-8) 예약 계획을 계산하는 순수 함수 모음.
// 부수 효과(알림 예약·저장소)는 NotificationManager가 맡고, 여기서는 시각만 계산한다.

export const NEXT_TRIP_DELAY_DAYS = 10;

export const REMINDER_HOUR = 19;

// dayjs day(): 0=일 ~ 6=토. 목요일.
export const WEEKEND_WEEKDAY = 4;

export const WEEKEND_INTERVAL_DAYS = 14;

export const WEEKEND_TRIP_LOOKAHEAD_DAYS = 14;

export const WEEKEND_MAX_UNANSWERED = 3;

export const REMINDER_SPACING_DAYS = 3;

const WEEKEND_SEARCH_WEEKS = 26;

const DELIVERED_KEYS_LIMIT = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export type ReengagementTrip = {
  id: string;
  name: string;
  startMs: number;
  endMs: number;
};

export type ScheduledNextTrip = {
  key: string;
  fireAt: number;
};

export type ReengagementState = {
  nextTrip: ScheduledNextTrip | null;
  weekendFireAts: number[];
  deliveredNextTripKeys: string[];
  lastWeekendDeliveredAt: number | null;
};

export type NextTripPlan = {
  key: string;
  tripId: string;
  tripName: string;
  fireAt: number;
};

export type ReengagementPlan = {
  nextTrip: NextTripPlan | null;
  weekendFireAts: number[];
};

export const EMPTY_REENGAGEMENT_STATE: ReengagementState = {
  nextTrip: null,
  weekendFireAts: [],
  deliveredNextTripKeys: [],
  lastWeekendDeliveredAt: null,
};

const isValidTrip = (trip: ReengagementTrip) =>
  Number.isFinite(trip.startMs) &&
  Number.isFinite(trip.endMs) &&
  trip.endMs >= trip.startMs;

const atReminderHour = (date: Dayjs) =>
  date.hour(REMINDER_HOUR).minute(0).second(0).millisecond(0);

// 저장 상태를 정규화한다 — 깨졌거나 옛 형식이면 빈 상태로 되돌린다.
export const parseReengagementState = (raw: unknown): ReengagementState => {
  if (!raw || typeof raw !== 'object') {
    return { ...EMPTY_REENGAGEMENT_STATE };
  }

  const value = raw as Partial<ReengagementState>;
  const nextTrip =
    value.nextTrip &&
    typeof value.nextTrip.key === 'string' &&
    Number.isFinite(value.nextTrip.fireAt)
      ? { key: value.nextTrip.key, fireAt: value.nextTrip.fireAt }
      : null;

  return {
    nextTrip,
    weekendFireAts: Array.isArray(value.weekendFireAts)
      ? value.weekendFireAts.filter(fireAt => Number.isFinite(fireAt))
      : [],
    deliveredNextTripKeys: Array.isArray(value.deliveredNextTripKeys)
      ? value.deliveredNextTripKeys.filter(key => typeof key === 'string')
      : [],
    lastWeekendDeliveredAt: Number.isFinite(value.lastWeekendDeliveredAt)
      ? (value.lastWeekendDeliveredAt as number)
      : null,
  };
};

// 예약 시각이 지난 항목을 "발송됨"으로 옮긴다(NT-9). 예약 목록은 그대로 두고, 재계획 후 덮어쓴다.
export const absorbDelivered = (
  state: ReengagementState,
  now: number
): ReengagementState => {
  let deliveredNextTripKeys = state.deliveredNextTripKeys;

  if (
    state.nextTrip &&
    state.nextTrip.fireAt <= now &&
    !deliveredNextTripKeys.includes(state.nextTrip.key)
  ) {
    deliveredNextTripKeys = [
      ...deliveredNextTripKeys,
      state.nextTrip.key,
    ].slice(-DELIVERED_KEYS_LIMIT);
  }

  const deliveredWeekends = state.weekendFireAts.filter(
    fireAt => fireAt <= now
  );
  const lastWeekendDeliveredAt =
    deliveredWeekends.length > 0
      ? Math.max(state.lastWeekendDeliveredAt ?? 0, ...deliveredWeekends)
      : state.lastWeekendDeliveredAt;

  return {
    nextTrip:
      state.nextTrip && state.nextTrip.fireAt > now ? state.nextTrip : null,
    weekendFireAts: state.weekendFireAts.filter(fireAt => fireAt > now),
    deliveredNextTripKeys,
    lastWeekendDeliveredAt,
  };
};

// NT-7: 가장 늦게 끝나는 여행의 종료일 +10일 19:00. 여행당(배낭ID+종료일) 1회.
export const planNextTrip = (
  trips: ReengagementTrip[],
  state: ReengagementState,
  now: number
): NextTripPlan | null => {
  const anchor = trips
    .filter(isValidTrip)
    .reduce<ReengagementTrip | null>(
      (latest, trip) => (!latest || trip.endMs > latest.endMs ? trip : latest),
      null
    );

  if (!anchor) {
    return null;
  }

  const endDay = dayjs(anchor.endMs).startOf('day');
  const key = `${anchor.id}:${endDay.format('YYYYMMDD')}`;

  if (state.deliveredNextTripKeys.includes(key)) {
    return null;
  }

  const fireAt = atReminderHour(
    endDay.add(NEXT_TRIP_DELAY_DAYS, 'day')
  ).valueOf();

  if (fireAt <= now) {
    return null;
  }

  return { key, tripId: anchor.id, tripName: anchor.name, fireAt };
};

// 후보 시각부터 14일 안에 겹치는(진행 중 포함) 여행이 있는가.
const hasTripWithinLookahead = (
  trips: ReengagementTrip[],
  candidate: number
) => {
  const lookaheadEnd = candidate + WEEKEND_TRIP_LOOKAHEAD_DAYS * DAY_MS;

  return trips.filter(isValidTrip).some(trip => {
    const tripStart = dayjs(trip.startMs).startOf('day').valueOf();
    const tripEnd = dayjs(trip.endMs).endOf('day').valueOf();

    return tripStart <= lookaheadEnd && tripEnd >= candidate;
  });
};

// 기준 시각 이후(초과) 첫 목요일 19:00.
const getNextWeekendSlot = (from: number): Dayjs => {
  const base = dayjs(from);
  const offset = (WEEKEND_WEEKDAY - base.day() + 7) % 7;
  const slot = atReminderHour(base.add(offset, 'day'));

  return slot.valueOf() > from ? slot : slot.add(7, 'day');
};

// NT-8: 목요일 19:00, 14일 1회, 14일 안 여행 없음, NT-7과 3일 이상 간격, 최대 3건 체인.
export const planWeekendCamp = (
  trips: ReengagementTrip[],
  state: ReengagementState,
  nextTripFireAt: number | null,
  now: number
): number[] => {
  const earliest =
    state.lastWeekendDeliveredAt === null
      ? now
      : Math.max(
          now,
          // 달력 일 단위로 더해 DST가 있는 시간대에서도 같은 요일 19:00 슬롯이 경계에 걸린다.
          dayjs(state.lastWeekendDeliveredAt)
            .add(WEEKEND_INTERVAL_DAYS, 'day')
            .subtract(1, 'millisecond')
            .valueOf()
        );
  const spacing = REMINDER_SPACING_DAYS * DAY_MS;
  const fireAts: number[] = [];
  let candidate = getNextWeekendSlot(earliest);

  for (
    let week = 0;
    week < WEEKEND_SEARCH_WEEKS && fireAts.length < WEEKEND_MAX_UNANSWERED;
    week += 1
  ) {
    const fireAt = candidate.valueOf();
    const lastPlanned = fireAts[fireAts.length - 1];
    const tooSoonAfterPlanned =
      lastPlanned !== undefined &&
      candidate.diff(dayjs(lastPlanned), 'day') < WEEKEND_INTERVAL_DAYS;
    const tooCloseToNextTrip =
      nextTripFireAt !== null && Math.abs(fireAt - nextTripFireAt) < spacing;

    if (
      !tooSoonAfterPlanned &&
      !tooCloseToNextTrip &&
      !hasTripWithinLookahead(trips, fireAt)
    ) {
      fireAts.push(fireAt);
    }

    candidate = candidate.add(7, 'day');
  }

  return fireAts;
};

// hasBriefingTarget: 브리핑 대상 박지(NT-11 ①~③ — 여행지 박지·즐겨찾기)가 있으면 목요일은 서버 브리핑이
// 맡으므로 NT-8을 예약하지 않는다(2026-10-10 개정). 판단 자체는 호출자가 자기 데이터로 한다.
export const planReengagement = (
  trips: ReengagementTrip[],
  state: ReengagementState,
  now: number,
  hasBriefingTarget: boolean
): ReengagementPlan => {
  const nextTrip = planNextTrip(trips, state, now);
  const weekendFireAts = hasBriefingTarget
    ? []
    : planWeekendCamp(trips, state, nextTrip?.fireAt ?? null, now);

  return { nextTrip, weekendFireAts };
};
