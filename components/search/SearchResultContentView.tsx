import { FC, useCallback, useState } from 'react';
import { FlatList, StyleSheet, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Gear from '@/model/gear/Gear';
import SearchSkeletonView from './SearchSkeletonView';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import { observer } from 'mobx-react-lite';
import Bag from '@/model/bag/Bag';
import { GearAddContext } from '@/model/gear/GearAddContext';
import FeedCardView from '@/components/feed/FeedCardView';
import PretendardText from '@/components/PretendardText';
import { Color } from '@/constants/DesignTokens';
import { useFocusEffect } from 'expo-router';

// SR-2: 피드 카드(FD-2)와 동일한 2컬럼 그리드 간격.
const COLUMN_GAP = 12;
const ROW_GAP = 24;

// 쿠팡 링크가 **실제로 노출된 카드가 있을 때만** 푸터에서 1회 고지한다(FD-2와 동일, GD-5 취지).
// 링크가 하나도 없는 결과에까지 문구를 띄우지 않는다.
const COUPANG_DISCLAIMER =
  '이 링크는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.';

interface Props {
  result: Gear[];
  canLoadMore: boolean;
  handleLoadMore: () => void;
  searchWarehouse: SearchWarehouse;
  bag: Bag;
  gearAddContext?: GearAddContext | undefined;
  children?: React.ReactNode;
}

// SR-2: 검색 결과를 피드와 동일한 2컬럼 카드 그리드로 렌더한다(FeedCardView 재사용).
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
  /**
   * 이 화면에서 쿠팡 링크가 붙은 카드를 한 번이라도 봤는지.
   *
   * **한 번 켜지면 되돌리지 않는다.** 검색어를 바꿔 링크가 없는 결과가 와도 고지가 남는데,
   * 그쪽이 안전한 방향이다 — 이미 제휴 링크를 노출한 화면이고, 목록 추가 로드(페이지네이션)
   * 때마다 초기화하면 이미 마운트된 카드가 다시 알려주지 않아 고지가 사라져 버린다.
   */
  const [hasCoupangLink, setHasCoupangLink] = useState(false);

  // 카드 로드 effect의 의존성이라 참조를 고정한다(FeedCardView의 prop 주석 참고).
  const handleCoupangLinkLoaded = useCallback(() => {
    setHasCoupangLink(true);
  }, []);

  // iOS는 결과 리스트가 탭바 뒤로 흐르므로(edge-to-edge) 마지막 카드가 가리지 않게 탭바 영역만큼 더한다.
  const listBottomPadding = Platform.OS === 'ios' ? insets.bottom + 40 : 80;

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
          <FeedCardView
            gear={gear}
            actions={searchWarehouse}
            bag={bag}
            gearAddContext={gearAddContext}
            onCoupangLinkLoaded={handleCoupangLinkLoaded}
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
              <SearchSkeletonView />
            </View>
          )}
          {hasCoupangLink && !isLoading ? (
            <PretendardText style={styles.disclaimer}>
              {COUPANG_DISCLAIMER}
            </PretendardText>
          ) : null}
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
    // 마지막 홀수 카드가 남는 폭 전체로 늘어나지 않도록 최대 절반으로 제한한다(FD-2).
    maxWidth: '50%',
  },
  flatListContent: {
    flexGrow: 1,
    paddingTop: 12,
  },
  skeletonContainer: {
    marginTop: 10,
  },
  disclaimer: {
    fontSize: 11,
    color: Color.textSecondary,
    textAlign: 'center',
  },
});

export default observer(SearchResultContentView);
