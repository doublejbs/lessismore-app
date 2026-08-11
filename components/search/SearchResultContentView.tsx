import { FC, useCallback } from 'react';
import { FlatList, StyleSheet, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Gear from '@/model/gear/Gear';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import { observer } from 'mobx-react-lite';
import Bag from '@/model/bag/Bag';
import { GearAddContext } from '@/model/gear/GearAddContext';
import FeedGridCellView from '@/components/feed/FeedGridCellView';
import FeedSkeletonView from '@/components/feed/FeedSkeletonView';
import { AcgLayout } from '@/constants/DesignTokens';
import { useFocusEffect } from 'expo-router';

// SR-2: 피드 그리드(FD-2)와 **같은 간격**을 쓴다. 같은 탭 안에서 키워드 유무로만 갈리는 목록이라
// 간격이 다르면 검색어를 넣는 순간 레이아웃이 흔들린다.
const COLUMN_GAP = 16;
const ROW_GAP = 24;

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

  // iOS는 결과 리스트가 탭바 뒤로 흐르므로(edge-to-edge) 마지막 셀이 가리지 않게 탭바 영역만큼 더한다.
  const listBottomPadding =
    Platform.OS === 'ios'
      ? insets.bottom + AcgLayout.scrollBottom
      : AcgLayout.scrollBottom;

  useFocusEffect(
    useCallback(() => {
      searchWarehouse.executeSearch();
    }, [searchWarehouse])
  );

  return (
    <FlatList
      data={result}
      numColumns={2}
      columnWrapperStyle={styles.columnWrapper}
      renderItem={({ item: gear }) => (
        <View style={styles.cell}>
          <FeedGridCellView
            gear={gear}
            actions={searchWarehouse}
            bag={bag}
            gearAddContext={gearAddContext}
          />
        </View>
      )}
      keyExtractor={(gear: Gear) => gear.getId()}
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
  cell: {
    flex: 1,
    // 마지막 홀수 셀이 남는 폭 전체로 늘어나지 않도록 최대 절반으로 제한한다(FD-2).
    maxWidth: '50%',
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
