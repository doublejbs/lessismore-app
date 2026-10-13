import dayjs, { Dayjs } from 'dayjs';
import BagItem from '@/model/bag/BagItem';
import HomeTripStage from '@/model/home/HomeTripStage';
import { selectTripPlan } from '@/model/home/HomeTripPlan';

export interface SubscriptionHeroCoordinate {
  latitude: number;
  longitude: number;
}

// SUB-2: 다가오는 여행에 여행지가 없을 때 히어로 지도의 중심 — 북한산.
export const DEFAULT_HERO_COORDINATE: SubscriptionHeroCoordinate = {
  latitude: 37.6586,
  longitude: 126.9778,
};

// 좌표가 그릴 수 있는 값인지. (0,0)은 좌표 미기입이 그대로 저장된 값이라 배제한다(MAP-3 훅과 같은 규칙).
const hasDrawableLocation = (bag: BagItem): boolean => {
  const location = bag.getLocation();

  if (!location) {
    return false;
  }

  const { latitude, longitude } = location;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return false;
  }

  return latitude !== 0 || longitude !== 0;
};

/**
 * SUB-2 히어로의 **다가오는 여행** — 여행지(`location`)가 있는 배낭 중 하나.
 *
 * 홈 다가오는 일정(HM-1 `selectTripPlan`)과 같은 순서로 고른다: 여행 중 > 임박 > 계획, 같은 등급이면
 * 시작일이 가까운 쪽. 여행지가 있는 배낭만 후보로 두고, 끝난 여행(종료 직후)은 다가오는 여행이 아니라
 * 뺀다. 없으면 null. 히어로는 이 배낭의 코스를 그리고(코스가 있으면), 없으면 여행지에 예시 코스를 둔다.
 */
export const selectHeroBag = (
  bags: BagItem[],
  today: Dayjs = dayjs()
): BagItem | null => {
  const { trips } = selectTripPlan(bags.filter(hasDrawableLocation), today);
  const upcoming = trips.find(
    entry => entry.stage !== HomeTripStage.JustFinished
  );

  return upcoming?.bag ?? null;
};

// SUB-2 히어로 지도 중심 — 다가오는 여행의 여행지, 없으면 북한산.
export const getHeroCoordinate = (
  bag: BagItem | null
): SubscriptionHeroCoordinate => {
  const location = bag?.getLocation() ?? null;

  if (!location) {
    return DEFAULT_HERO_COORDINATE;
  }

  return { latitude: location.latitude, longitude: location.longitude };
};
