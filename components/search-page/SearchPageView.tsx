import { observer } from 'mobx-react-lite';
import { reaction } from 'mobx';
import { FC, useEffect } from 'react';
import SearchResultView from '../search/SearchResultView';
import SearchBarView from '../search/SearchBarView';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import Bag from '@/model/bag/Bag';
import Feed from '@/model/feed/Feed';
import Layout from '../Layout';

interface Props {
  searchWarehouse: SearchWarehouse;
  bag: Bag;
  feed: Feed;
}

const SearchPageView: FC<Props> = ({ searchWarehouse, bag, feed }) => {
  // 검색 승계(SR-1): 검색 시 현재 피드 필터(카테고리·브랜드)를 facet으로 넘긴다.
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

    // 검색 결과 화면에서 필터를 바꾸면 현재 키워드로 즉시 재검색한다.
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

  return (
    <Layout paddingHorizontal={0}>
      <SearchBarView searchWarehouse={searchWarehouse} />
      <SearchResultView
        searchWarehouse={searchWarehouse}
        bag={bag}
        feed={feed}
      />
    </Layout>
  );
};

export default observer(SearchPageView);
