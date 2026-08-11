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

  return (
    <Layout
      paddingHorizontal={0}
      edges={Platform.OS === 'ios' ? IOS_EDGES : undefined}
      background={<LiquidBackdrop screen='none' glowPosition='topRight' />}
    >
      {/**
       * `탐색` 타이틀은 검색어가 있어도 **내리지 않는다**(2026-08-11 디자인 리뷰).
       *
       * 검색어에 따라 타이틀을 걷으면 같은 탭 안에서 검색 필드가 위로 점프해 화면 구조가
       * 뒤집힌다 — 필드 자리를 고정하고, 결과 라벨은 `검색 결과 234` 서브라인으로 내려
       * 위계를 갈랐다(SearchResultView).
       */}
      <SearchBarView searchWarehouse={searchWarehouse} title='탐색' />
      <SearchResultView
        searchWarehouse={searchWarehouse}
        bag={bag}
        feed={feed}
      />
    </Layout>
  );
};

export default observer(SearchPageView);
