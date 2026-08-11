import { observer } from 'mobx-react-lite';
import { FC, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
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
  const result = searchWarehouse.getResult();

  /**
   * SR-1: 화면 포커스 복귀 시 현재 키워드로 재검색해 보유 배지를 맞춘다.
   *
   * **결과 뷰가 아니라 이 컴포넌트가 갖는다.** 이 컴포넌트는 키워드·결과 유무와 무관하게 검색
   * 화면이 떠 있는 동안 계속 마운트돼 있어 포커스가 바뀔 때만 실행된다. 결과 뷰에 두면
   * 빈 상태 ↔ 결과 전환마다 재검색이 돌아 타이핑 중 화면이 깜빡였다.
   */
  useFocusEffect(
    useCallback(() => {
      if (searchWarehouse.getKeyword()) {
        searchWarehouse.executeSearch();
      }
    }, [searchWarehouse])
  );

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
      // 빈 상태 문구는 **검색이 끝난 뒤에만** 띄운다(`isSettled`) — 디바운스 대기 중이거나
      // 요청이 진행 중일 때의 빈 결과는 "없다"는 뜻이 아니다.
      case isEmpty && searchWarehouse.isSettled(): {
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
