import { observer } from 'mobx-react-lite';
import { FC } from 'react';
import { Platform } from 'react-native';
import SearchResultView from '../search/SearchResultView';
import SearchBarView from '../search/SearchBarView';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import Bag from '@/model/bag/Bag';
import Feed from '@/model/feed/Feed';
import useSearchFilterInheritance from '@/hooks/useSearchFilterInheritance';
import Layout from '../Layout';
import LiquidBackdrop from '@/components/liquid/LiquidBackdrop';

interface Props {
  searchWarehouse: SearchWarehouse;
  bag: Bag;
  feed: Feed;
}

// iOS는 피드/검색 결과가 탭바 뒤로 흐르도록(edge-to-edge) 하단 세이프에어리어를 뺀다.
const IOS_EDGES = ['top', 'left', 'right'] as const;

const SearchPageView: FC<Props> = ({ searchWarehouse, bag, feed }) => {
  // 검색 승계(SR-1): 현재 피드 필터를 검색 facet으로 넘기고 필터 변경 시 재검색.
  useSearchFilterInheritance(searchWarehouse, feed);

  const hasKeyword = !!searchWarehouse.getKeyword().length;

  return (
    <Layout
      paddingHorizontal={0}
      edges={Platform.OS === 'ios' ? IOS_EDGES : undefined}
      background={<LiquidBackdrop screen='none' glowPosition='topRight' />}
    >
      {/**
       * 검색어가 있으면 `탐색` 타이틀을 내린다(핸드오프 §2·§3).
       *
       * 검색 결과 화면의 화면 대상은 `검색 결과`(SearchResultView)라 두 타이틀이 겹치면
       * 위계가 둘로 갈린다 — 필드 위는 비우고 결과 제목에 자리를 넘긴다.
       */}
      <SearchBarView
        searchWarehouse={searchWarehouse}
        {...(hasKeyword ? {} : { title: '탐색' })}
      />
      <SearchResultView
        searchWarehouse={searchWarehouse}
        bag={bag}
        feed={feed}
      />
    </Layout>
  );
};

export default observer(SearchPageView);
