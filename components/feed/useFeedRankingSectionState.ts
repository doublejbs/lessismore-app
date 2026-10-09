import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import Feed from '@/model/feed/Feed';
import GearFilter from '@/model/gear/GearFilter';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import { GearAddContext } from '@/model/gear/GearAddContext';

// FD-6: 섹션은 상위 5개만 그린다(조회는 기존 limit 10 그대로).
const FEED_RANKING_SECTION_COUNT = 5;

interface Params {
  feed: Feed;
  searchWarehouse: SearchWarehouse;
  gearAddContext?: GearAddContext | undefined;
}

/**
 * FD-6: 피드 상단 인기 순위 섹션의 로드·노출 상태.
 *
 * **섹션 뷰가 아니라 `FeedView`에서 호출한다.** 피드가 재구성될 때(카테고리 변경 등) FeedView는
 * 스켈레톤 분기 ↔ 목록 분기를 오가며 섹션을 리마운트하는데, 로드를 섹션에 두면 그때마다
 * 순위를 다시 조회하고 스켈레톤이 깜빡인다. FeedView는 두 분기 내내 마운트돼 있다.
 *
 * - 카테고리 승계: `feed.getFilterCategory()`(그룹 카테고리, 미선택 = 전체).
 * - 숨김: 장비 추가 컨텍스트(검색 승계 상태)·브랜드 필터 선택·결과 0건·로드 실패(`SearchRank`가
 *   실패 시 빈 배열로 둔다 → 0건과 같이 조용히 숨긴다). 정렬과는 무관하다.
 * - 포커스 복귀 시 같은 카테고리면 스켈레톤 없이 다시 읽어 보유 배지만 맞춘다(전용 화면과 같은 방식).
 */
const useFeedRankingSectionState = ({
  feed,
  searchWarehouse,
  gearAddContext,
}: Params) => {
  const searchRank = searchWarehouse.getSearchRank();
  const category = (feed.getFilterCategory() ?? GearFilter.All) as GearFilter;
  const hasBrandFilter = feed.getFilterBrands().length > 0;
  const isEnabled = !gearAddContext && !hasBrandFilter;

  // 마운트·카테고리 변경 시 로드한다. 포커스 이펙트에만 걸면 탭 안에 중첩된 이 뷰에서는 첫 로드가
  // 보장되지 않는다(2026-10-09 시뮬레이터 실측 — 포커스 콜백이 돌지 않아 섹션이 비어 있었다).
  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    const hasLoadedSameCategory =
      searchRank.getSelectedCategory() === category && searchRank.hasLoaded();

    void searchRank.loadRanking(category, !hasLoadedSameCategory);
  }, [searchRank, category, isEnabled]);

  // 다른 화면에서 담기·제거 후 돌아오면 보유 배지만 조용히 맞춘다(스켈레톤 없이, 전용 화면과 같은 방식).
  // 카테고리·활성 여부는 ref로 읽는다 — 의존성에 넣으면 포커스 중 콜백이 바뀔 때마다 다시 돌아
  // 위 useEffect의 로드와 같은 조회가 두 번 나간다.
  const latestRef = useRef({ category, isEnabled });

  useEffect(() => {
    latestRef.current = { category, isEnabled };
  }, [category, isEnabled]);

  useFocusEffect(
    useCallback(() => {
      const latest = latestRef.current;

      if (!latest.isEnabled || !searchRank.hasLoaded()) {
        return;
      }

      void searchRank.loadRanking(latest.category, false);
    }, [searchRank])
  );

  // 카테고리를 막 바꾼 프레임에는 이전 카테고리 순위가 남아 있으므로 로딩으로 본다.
  const isRankingLoading =
    searchRank.isLoading() ||
    !searchRank.hasLoaded() ||
    searchRank.getSelectedCategory() !== category;
  const gears = searchRank.getGears().slice(0, FEED_RANKING_SECTION_COUNT);
  const isVisible = isEnabled && (isRankingLoading || gears.length > 0);

  return {
    searchRank,
    category,
    gears,
    isRankingLoading,
    isVisible,
    rankingCount: FEED_RANKING_SECTION_COUNT,
  };
};

export default useFeedRankingSectionState;
