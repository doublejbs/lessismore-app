import { observer } from 'mobx-react-lite';
import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import PretendardText from '@/components/PretendardText';
import {
  Liquid,
  LiquidFont,
  LiquidLayout,
  LiquidType,
} from '@/constants/DesignTokens';
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

// SR-2(Liquid Depth): 검색 결과 화면 상단 — 채워진 검색 필드 아래 `검색 결과` + 개수, 그 아래 칩 줄.
const RESULT_TITLE = '검색 결과';

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
  const totalCount = searchWarehouse.getTotalCount();

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
        // 빈 상태는 사실 + 다음 걸음 두 줄(Liquid Depth 카피 규칙).
        return (
          <View style={styles.emptyContainer}>
            <PretendardText weight='semibold' style={styles.emptyTitle}>
              찾는 장비가 없어요
            </PretendardText>
            <PretendardText style={styles.emptyText}>
              브랜드 이름으로 다시 찾아볼까요?
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
      {/**
       * 개수는 숫자라 콘덴스드를 쓴다. 제목과 베이스라인을 맞춰 한 덩어리로 읽히게 한다.
       *
       * 값은 **총 히트 수**(`nbHits`)라 첫 응답부터 확정이다 — 누적 건수를 쓰면 스크롤할 때마다
       * 숫자가 커지고, 로딩 상태로 가렸다 붙이면 개수가 깜빡인다. 0이면(아직 못 받았거나
       * 결과 없음) 자리만 비운다.
       */}
      <View style={styles.titleRow}>
        <PretendardText weight='bold' style={styles.title}>
          {RESULT_TITLE}
        </PretendardText>
        {totalCount > 0 ? (
          <PretendardText style={styles.count}>{totalCount}</PretendardText>
        ) : null}
      </View>

      {feed ? (
        <FeedFilterBarView feed={feed} showSort={false} topGap={14} />
      ) : null}
      <View style={styles.container}>{render()}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  resultContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    paddingHorizontal: LiquidLayout.screenH,
    paddingTop: 18,
  },
  title: {
    fontSize: LiquidType.title3.fontSize,
    lineHeight: LiquidType.title3.lineHeight,
    letterSpacing: LiquidType.title3.letterSpacing,
    color: Liquid.ink,
  },
  count: {
    fontFamily: LiquidFont.condensed,
    fontSize: 17,
    color: Liquid.inkMuted,
  },
  container: {
    flex: 1,
    paddingHorizontal: LiquidLayout.screenH,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 6,
  },
  emptyTitle: {
    fontSize: LiquidType.heading.fontSize,
    lineHeight: LiquidType.heading.lineHeight,
    color: Liquid.ink,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: LiquidType.body.fontSize,
    lineHeight: LiquidType.body.lineHeight,
    color: Liquid.inkTertiary,
    textAlign: 'center',
  },
});

export default observer(SearchResultView);
