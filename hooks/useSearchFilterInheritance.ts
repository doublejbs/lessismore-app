import { useEffect } from 'react';
import { reaction } from 'mobx';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import Feed from '@/model/feed/Feed';

// SR-1 검색 승계: 검색 시 현재 피드 필터(카테고리·브랜드)를 facet으로 넘기고,
// 검색 결과 화면에서 필터를 바꾸면 현재 키워드로 즉시 재검색한다. 언마운트 시 피드를 dispose한다.
// 탐색 탭(SearchPageView)과 장비 추가 검색 모달(SearchWarehouseView)이 공유한다.
const useSearchFilterInheritance = (
  searchWarehouse: SearchWarehouse,
  feed: Feed
) => {
  useEffect(() => {
    searchWarehouse.setSearchFilterProvider(() => {
      const filters: { category?: string; brands?: string[] } = {};
      // 세분 선택이 있으면 세분 키를 우선 넘긴다(FD-3 검색 승계).
      const category = feed.getEffectiveFilterCategory();
      const brandNames = feed.getFilterBrandNames();

      if (category) {
        filters.category = category;
      }

      if (brandNames.length > 0) {
        filters.brands = brandNames;
      }

      return filters;
    });

    const disposeFilterReaction = reaction(
      () => ({
        category: feed.getEffectiveFilterCategory(),
        brandNames: feed.getFilterBrandNames().join('|'),
      }),
      () => {
        if (searchWarehouse.getKeyword()) {
          searchWarehouse.executeSearch();
        }
      }
    );

    return () => {
      disposeFilterReaction();
      searchWarehouse.setSearchFilterProvider(null);
      feed.dispose();
    };
  }, [searchWarehouse, feed]);
};

export default useSearchFilterInheritance;
