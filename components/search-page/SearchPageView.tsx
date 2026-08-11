import { observer } from 'mobx-react-lite';
import { FC } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import SearchResultView from '../search/SearchResultView';
import SearchBarView from '../search/SearchBarView';
import SearchBarVariant from '../search/SearchBarVariant';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import Bag from '@/model/bag/Bag';
import Feed from '@/model/feed/Feed';
import useSearchFilterInheritance from '@/hooks/useSearchFilterInheritance';
import Layout from '../Layout';
import { Acg } from '@/constants/DesignTokens';

interface Props {
  searchWarehouse: SearchWarehouse;
  bag: Bag;
  feed: Feed;
}

// iOS는 피드/검색 결과가 탭바 뒤로 흐르도록(edge-to-edge) 하단 세이프에어리어를 뺀다.
const IOS_EDGES = ['top', 'left', 'right'] as const;

// FD-2: 탐색 탭 지면은 **순백**이다(레퍼런스 이식, 2026-08-11) — 공통 지면
// (`AcgScreenBackground`: 회색 + 그레인 + 지형 마크) 대신 텍스처 없는 흰 면을 깐다.
// 다른 탭은 아직 공통 지면을 쓰므로 Layout의 기본값은 그대로 둔다.
const SearchPageView: FC<Props> = ({ searchWarehouse, bag, feed }) => {
  // 검색 승계(SR-1): 현재 피드 필터를 검색 facet으로 넘기고 필터 변경 시 재검색.
  useSearchFilterInheritance(searchWarehouse, feed);

  return (
    <Layout
      paddingHorizontal={0}
      edges={Platform.OS === 'ios' ? IOS_EDGES : undefined}
      background={<View style={styles.paper} />}
    >
      <SearchBarView
        searchWarehouse={searchWarehouse}
        variant={SearchBarVariant.Plain}
      />
      <SearchResultView
        searchWarehouse={searchWarehouse}
        bag={bag}
        feed={feed}
      />
    </Layout>
  );
};

const styles = StyleSheet.create({
  paper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Acg.paper,
  },
});

export default observer(SearchPageView);
