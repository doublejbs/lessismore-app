import { observer } from 'mobx-react-lite';
import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import PretendardText from '@/components/PretendardText';
import { Color } from '@/constants/DesignTokens';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import Bag from '@/model/bag/Bag';
import { GearAddContext } from '@/model/gear/GearAddContext';
import Feed from '@/model/feed/Feed';
import FeedView from '../feed/FeedView';
import FeedFilterBarView from '../feed/FeedFilterBarView';
import SearchResultContentView from './SearchResultContentView';

interface Props {
  searchWarehouse: SearchWarehouse;
  bag: Bag;
  feed?: Feed;
  gearAddContext?: GearAddContext | undefined;
  children?: React.ReactNode;
}

const SearchResultView: FC<Props> = ({
  searchWarehouse,
  bag,
  feed,
  gearAddContext,
  children,
}) => {
  const keyword = searchWarehouse.getKeyword();
  const isEmpty = searchWarehouse.isEmpty();
  const canLoadMore = searchWarehouse.canLoadMore();
  const isLoading = searchWarehouse.isLoading();
  const result = searchWarehouse.getResult();

  const handleLoadMore = () => {
    searchWarehouse.searchMore();
  };

  // FD-2: 키워드가 없으면 검색 홈(SR-6) 대신 장비 피드를 렌더한다.
  // 피드는 자체 여백을 관리하므로 20px 패딩 컨테이너를 우회해 전체 폭으로 렌더한다.
  // 탐색 탭은 필터 상태 유지를 위해 상위에서 공유하는 feed를 내려준다(FD-3 검색 승계).
  if (!keyword.length) {
    return (
      <FeedView
        bag={bag}
        {...(feed ? { feed } : {})}
        gearAddContext={gearAddContext}
      />
    );
  }

  const render = () => {
    switch (true) {
      case isEmpty && !isLoading: {
        return (
          <View style={styles.emptyContainer}>
            <PretendardText style={styles.emptyText}>
              검색 결과가 없습니다
            </PretendardText>
          </View>
        );
      }
      default: {
        return (
          <SearchResultContentView
            result={result}
            canLoadMore={canLoadMore}
            handleLoadMore={handleLoadMore}
            searchWarehouse={searchWarehouse}
            bag={bag}
            gearAddContext={gearAddContext}
          >
            {children}
          </SearchResultContentView>
        );
      }
    }
  };

  // 검색 승계(SR-1): 검색 결과 위에도 필터 바를 유지 노출한다(정렬은 검색 미적용이라 숨김).
  return (
    <View style={styles.resultContainer}>
      {feed ? <FeedFilterBarView feed={feed} showSort={false} /> : null}
      <View style={styles.container}>{render()}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  resultContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    // 피드 그리드와 같은 값(FD-2) — 검색어를 넣는 순간 좌우 여백이 달라지면 목록이 흔들린다.
    paddingHorizontal: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
  },
  emptyText: {
    color: Color.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
  flatListContent: {
    flexGrow: 1,
    paddingBottom: 80,
  },
  skeletonContainer: {
    marginTop: 10,
  },
});

export default observer(SearchResultView);
