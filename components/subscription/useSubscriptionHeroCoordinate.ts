import { useEffect, useState } from 'react';
import app from '@/model/app/App';
import BagItem from '@/model/bag/BagItem';
import {
  selectHeroCoordinate,
  SubscriptionHeroCoordinate,
} from '@/model/subscription/SubscriptionHeroLocation';

// 배낭 목록 조회를 기다리는 한도. 넘기면(느린 망·오프라인) 기본 좌표(북한산)로 그린다.
const HERO_BAG_LOOKUP_TIMEOUT_MS = 2500;

// 로그인한 사용자의 배낭 목록. 비로그인·조회 실패·시간 초과는 빈 목록(기본 좌표)이다.
const loadBagsWithTimeout = async (): Promise<BagItem[]> => {
  const bagStore = app.getBagStore();

  if (!bagStore || !app.getFirebase().isLoggedIn()) {
    return [];
  }

  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const timeout = new Promise<BagItem[]>(resolve => {
    timeoutId = setTimeout(() => {
      resolve([]);
    }, HERO_BAG_LOOKUP_TIMEOUT_MS);
  });

  try {
    return await Promise.race([bagStore.getList(), timeout]);
  } finally {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
  }
};

/**
 * SUB-2 히어로 지도 중심. `BagStore`는 목록을 들고 있지 않아 화면이 열릴 때 한 번 조회한다.
 * 조회가 끝나기 전에는 null — 히어로는 연회색 면으로 자리를 잡고, 기본 좌표로 한 번 그렸다가
 * 여행지로 다시 그리지 않는다.
 */
const useSubscriptionHeroCoordinate = (): SubscriptionHeroCoordinate | null => {
  const [coordinate, setCoordinate] =
    useState<SubscriptionHeroCoordinate | null>(null);

  useEffect(() => {
    let isActive = true;

    const resolveCoordinate = async () => {
      const bags = await loadBagsWithTimeout();

      if (isActive) {
        setCoordinate(selectHeroCoordinate(bags));
      }
    };

    void resolveCoordinate();

    return () => {
      isActive = false;
    };
  }, []);

  return coordinate;
};

export default useSubscriptionHeroCoordinate;
