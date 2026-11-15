import { useEffect, useState } from 'react';
import app from '@/model/app/App';
import BagItem from '@/model/bag/BagItem';
import BagRouteSelection from '@/model/bag-route/BagRouteSelection';
import MapPoint from '@/model/point/MapPoint';
import { RouteDisplay } from '@/model/route/RouteDisplay';
import {
  SubscriptionHeroContent,
  toHeroContent,
} from '@/model/subscription/SubscriptionHeroContent';
import {
  getHeroCoordinate,
  selectHeroBag,
} from '@/model/subscription/SubscriptionHeroLocation';

/**
 * 히어로 조회 전체(배낭 목록 → 그 여행의 코스·포인트)를 기다리는 한도. 넘기면(느린 망·오프라인) 그때까지 읽은
 * 것으로 그린다 — 배낭을 못 읽었으면 북한산 예시, 코스를 못 읽었으면 여행지 예시.
 */
const HERO_LOOKUP_TIMEOUT_MS = 2500;

/**
 * 마감 시각까지 기다린다. 넘기거나 실패하면 `fallback`. 히어로는 장식이라 조회 실패를 화면에 알리지 않는다.
 */
const awaitUntil = async <T>(
  promise: Promise<T>,
  deadline: number,
  fallback: T
): Promise<T> => {
  const remaining = deadline - Date.now();

  if (remaining <= 0) {
    return fallback;
  }

  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const timeout = new Promise<T>(resolve => {
    timeoutId = setTimeout(() => {
      resolve(fallback);
    }, remaining);
  });

  try {
    return await Promise.race([promise, timeout]);
  } catch {
    return fallback;
  } finally {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
  }
};

// 로그인한 사용자의 배낭 목록. 비로그인·조회 실패·시간 초과는 빈 목록(기본 좌표)이다.
const loadBags = async (deadline: number): Promise<BagItem[]> => {
  const bagStore = app.getBagStore();

  if (!bagStore || !app.getFirebase().isLoggedIn()) {
    return [];
  }

  return awaitUntil(bagStore.getList(), deadline, []);
};

interface HeroCourse {
  routes: RouteDisplay[];
  points: MapPoint[];
  // 코스 화면에서 기억된 내 코스(BD-11 선택 기억). 그룹 코스를 골랐거나 기억이 없으면 `null`.
  selectedRouteId: string | null;
}

const EMPTY_COURSE: HeroCourse = {
  routes: [],
  points: [],
  selectedRouteId: null,
};

/**
 * 고른 여행의 코스·포인트 — 코스 화면과 같은 모델(`BagRouteStore.getRoutes` = `getRouteDataList` →
 * `BagRoute.from`, 뒤집기 설정 포함 / `BagPointStore.getPoints` = `getPointDataList` → `BagPoint.from`).
 * 말풍선 코스는 코스 화면의 선택 기억(`BagRouteSelection`)을 따른다.
 */
const loadCourse = async (
  bagId: string,
  deadline: number
): Promise<HeroCourse> => {
  const routeStore = app.getBagRouteStore();
  const pointStore = app.getBagPointStore();

  if (!routeStore) {
    return EMPTY_COURSE;
  }

  const [routes, points, selectedKey] = await Promise.all([
    awaitUntil<RouteDisplay[]>(routeStore.getRoutes(bagId), deadline, []),
    pointStore
      ? awaitUntil<MapPoint[]>(pointStore.getPoints(bagId), deadline, [])
      : Promise.resolve<MapPoint[]>([]),
    awaitUntil<string | null>(BagRouteSelection.load(bagId), deadline, null),
  ]);

  return {
    routes,
    points,
    selectedRouteId: BagRouteSelection.toBagRouteId(selectedKey),
  };
};

/**
 * SUB-2 ① 히어로가 그릴 것. `BagStore`는 목록을 들고 있지 않아 화면이 열릴 때 한 번 조회한다.
 *
 * 다가오는 여행(`selectHeroBag`)에 코스가 있으면 그 코스, 없으면 예시 코스(`routes` 빈 배열). 조회 전체에
 * 2.5초 상한을 둔다. 끝나기 전에는 null — 히어로는 연회색 면으로 자리를 잡고, 예시로 한 번 그렸다가 실제
 * 코스로 다시 그리지 않는다(지도가 두 번 바뀌어 보이지 않게).
 */
const useSubscriptionHeroContent = (): SubscriptionHeroContent | null => {
  const [content, setContent] = useState<SubscriptionHeroContent | null>(null);

  useEffect(() => {
    let isActive = true;

    const resolveContent = async () => {
      const deadline = Date.now() + HERO_LOOKUP_TIMEOUT_MS;
      const bag = selectHeroBag(await loadBags(deadline));
      const coordinate = getHeroCoordinate(bag);
      const course = bag
        ? await loadCourse(bag.getID(), deadline)
        : EMPTY_COURSE;

      if (isActive) {
        setContent(
          toHeroContent(
            coordinate,
            course.routes,
            course.points,
            course.selectedRouteId
          )
        );
      }
    };

    void resolveContent();

    return () => {
      isActive = false;
    };
  }, []);

  return content;
};

export default useSubscriptionHeroContent;
