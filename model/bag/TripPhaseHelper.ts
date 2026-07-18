import dayjs, { Dayjs } from 'dayjs';
import TripPhase from './TripPhase';

// 여행 기간(start~end, 경계 포함)으로 상황을 판정하는 순수 헬퍼.
// BagDetail.getTripPhase/getPhaseLabel과 동일 규칙이며, BagWeather만 가진 화면(여행지 허브 DST-8)이
// 재사용할 수 있도록 날짜만 받는 형태로 분리했다.
export const getTripPhase = (start: Dayjs, end: Dayjs): TripPhase => {
  const today = dayjs().startOf('day');

  if (end.startOf('day').isBefore(today)) {
    return TripPhase.After;
  }

  if (start.startOf('day').isAfter(today)) {
    return TripPhase.Before;
  }

  return TripPhase.Ongoing;
};

// 날짜 부제에 붙일 상황 라벨(D-day / 오늘 출발 / 여행 중 / 지난 여행).
export const getPhaseLabel = (start: Dayjs, end: Dayjs): string => {
  const today = dayjs().startOf('day');
  const phase = getTripPhase(start, end);

  if (phase === TripPhase.Before) {
    const d = start.startOf('day').diff(today, 'day');

    return d === 0 ? '오늘 출발' : `D-${d}`;
  }

  if (phase === TripPhase.Ongoing) {
    return '여행 중';
  }

  return '지난 여행';
};
