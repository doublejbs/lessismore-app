import { FC, useCallback } from 'react';
import {
  FlatList,
  ListRenderItemInfo,
  StyleSheet,
  View,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Gear from '@/model/gear/Gear';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import { observer } from 'mobx-react-lite';
import Bag from '@/model/bag/Bag';
import { GearAddContext } from '@/model/gear/GearAddContext';
import FeedGridCellView from '@/components/feed/FeedGridCellView';
import FeedSkeletonView from '@/components/feed/FeedSkeletonView';
import { AcgLayout } from '@/constants/DesignTokens';
import AdPlacement from '@/model/ads/AdPlacement';
import AdListEntryKind from '@/model/ads/AdListEntryKind';
import { AdListEntry } from '@/model/ads/AdListEntry';
import FeedAdCellView from '@/components/ads/FeedAdCellView';
import useAdSlotListState from '@/components/ads/useAdSlotListState';

// SR-2: 피드 그리드(FD-2)와 **같은 간격**을 쓴다. 같은 탭 안에서 키워드 유무로만 갈리는 목록이라
// 간격이 다르면 검색어를 넣는 순간 레이아웃이 흔들린다.
const COLUMN_GAP = 16;
const ROW_GAP = 24;

const COLUMN_COUNT = 2;

interface Props {
  result: Gear[];
  canLoadMore: boolean;
  handleLoadMore: () => void;
  searchWarehouse: SearchWarehouse;
  bag: Bag;
  gearAddContext?: GearAddContext | undefined;
  children?: React.ReactNode;
}

// SR-2: 검색 결과를 피드와 **같은 2열 그리드 셀**(`FeedGridCellView`)로 렌더한다.
// SearchWarehouse가 GearRowActions(담기/제거/상세 이동)를 구현하므로 actions로 그대로 넘긴다.
//
// **포커스 복귀 재검색(SR-1)은 이 컴포넌트에 두지 않는다.** 이 뷰는 결과 유무에 따라 붙었다
// 떨어지므로, 마운트마다 재검색하면 타이핑 중 디바운스와 별개로 검색이 한 번 더 돌아
// 문구 ↔ 스켈레톤이 번갈아 뜬다. 재검색은 화면이 떠 있는 동안 계속 붙어 있는
// `SearchResultView`가 맡는다.
//
// AD-1: 결과 사이에 피드와 같은 빈도·같은 셀(`FeedAdCellView`)로 광고를 끼운다(담기 검색 제외).
// 광고 자리는 이 뷰의 수명과 함께한다 — 검색어가 바뀌면 접힌 자리·보이는 범위를 되돌리고(`resetKey`),
// 받은 광고는 같은 순번 자리에 남는다(자리는 항목 순번으로만 정해진다). 결과가 없어 이 뷰가 내려가면
// 모두 해제된다.
const SearchResultContentView: FC<Props> = ({
  result,
  canLoadMore,
  handleLoadMore,
  searchWarehouse,
  children,
  bag,
  gearAddContext,
}) => {
  const isLoading = searchWarehouse.isLoading();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { slotList, viewabilityConfig, handleViewableItemsChanged } =
    useAdSlotListState({
      placement: AdPlacement.Search,
      itemCount: result.length,
      columnCount: COLUMN_COUNT,
      enabled: !gearAddContext,
      // 검색어가 바뀌면 결과가 통째로 바뀐다 — 지난 결과에서 접힌 자리를 되돌린다.
      resetKey: searchWarehouse.getKeyword(),
    });
  // 같은 항목·같은 광고면 같은 배열이다(`AdSlotList.getEntries` 캐시) — FlatList `data`가 렌더마다
  // 바뀌지 않는다. 결과 배열이 바뀌거나 제자리에서 늘면(더 보기) 새로 끼운다.
  const entries = slotList.getEntries(result);
  // 칸 폭을 한 열로 고정한다(FeedView와 같은 셈). 광고가 끼면 칸 수의 홀짝이 바뀌어 마지막 줄에
  // 홀로 남은 셀이 화면 폭 전체로 늘어날 수 있다. 좌우 여백은 부모(`SearchResultView`)가 두른다.
  const cellWidth =
    (windowWidth -
      AcgLayout.screenPadding * 2 -
      COLUMN_GAP * (COLUMN_COUNT - 1)) /
    COLUMN_COUNT;

  // iOS는 결과 리스트가 탭바 뒤로 흐르므로(edge-to-edge) 마지막 셀이 가리지 않게 탭바 영역만큼 더한다.
  const listBottomPadding =
    Platform.OS === 'ios'
      ? insets.bottom + AcgLayout.scrollBottom
      : AcgLayout.scrollBottom;

  const renderItem = useCallback(
    ({ item: entry }: ListRenderItemInfo<AdListEntry<Gear>>) => {
      if (entry.kind === AdListEntryKind.Ad) {
        const nativeAd = slotList.getAd(entry.slotIndex);

        return (
          <View style={[styles.cell, { maxWidth: cellWidth }]}>
            {nativeAd ? <FeedAdCellView nativeAd={nativeAd} /> : null}
          </View>
        );
      }

      return (
        <View style={[styles.cell, { maxWidth: cellWidth }]}>
          <FeedGridCellView
            gear={entry.item}
            actions={searchWarehouse}
            bag={bag}
            gearAddContext={gearAddContext}
          />
        </View>
      );
    },
    [searchWarehouse, bag, gearAddContext, slotList, cellWidth]
  );

  const keyExtractor = useCallback((entry: AdListEntry<Gear>) => {
    if (entry.kind === AdListEntryKind.Ad) {
      return `ad-${entry.slotIndex}`;
    }

    return entry.item.getId();
  }, []);

  return (
    <FlatList
      data={entries}
      numColumns={COLUMN_COUNT}
      columnWrapperStyle={styles.columnWrapper}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      viewabilityConfig={viewabilityConfig}
      onViewableItemsChanged={handleViewableItemsChanged}
      onEndReached={canLoadMore ? handleLoadMore : null}
      onEndReachedThreshold={0.1}
      ListFooterComponent={
        <>
          {children}
          {isLoading && (
            <View style={styles.skeletonContainer}>
              <FeedSkeletonView count={4} />
            </View>
          )}
        </>
      }
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.flatListContent,
        { paddingBottom: listBottomPadding },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  columnWrapper: {
    gap: COLUMN_GAP,
    marginBottom: ROW_GAP,
  },
  // 셀 하나의 칸. 같은 행 두 칸은 부모 stretch로 높이가 같아진다. 최대 폭은 렌더에서 한 열로 준다.
  cell: {
    flex: 1,
  },
  flatListContent: {
    flexGrow: 1,
    paddingTop: 12,
  },
  skeletonContainer: {
    marginTop: 10,
  },
});

export default observer(SearchResultContentView);
