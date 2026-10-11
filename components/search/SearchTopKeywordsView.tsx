import { observer } from 'mobx-react-lite';
import { FC, useCallback, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, LayoutChangeEvent } from 'react-native';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgType, Color } from '@/constants/DesignTokens';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import SearchRankSkeletonView from './SearchRankSkeletonView';
import SearchRankRowView from './SearchRankRowView';
import useSearchRankRowState from './useSearchRankRowState';
import GearFilter from '@/model/gear/GearFilter';
import { getGearFilterName } from '@/model/gear/GearFilterName';
import CategoryChipView from '../browse/CategoryChipView';
import Bag from '@/model/bag/Bag';
import SearchGearAddToBagModalView from './SearchGearAddToBagModalView';
import { useFocusEffect } from 'expo-router';
import app from '@/model/app/App';

interface Props {
  searchWarehouse: SearchWarehouse;
  bag: Bag;
  // 전용 화면(PopularRankingWrapper)이 자체 헤더를 두므로 내부 타이틀은 숨길 수 있다.
  showTitle?: boolean;
  // SR-4: 진입 시 승계할 카테고리(GearFilter 값). 이 화면의 8개 탭에 없으면 전체로 진입.
  initialCategory?: string | undefined;
}

interface CategoryItem {
  filter: GearFilter;
  name: string;
}

// SR-4 인기순위 카테고리 탭(고정 8개). 표시명은 GearFilterName 캐논컬 매핑에서 파생한다.
const SEARCH_RANK_CATEGORY_FILTERS: GearFilter[] = [
  GearFilter.All,
  GearFilter.Tent,
  GearFilter.SleepingBag,
  GearFilter.Backpack,
  GearFilter.Mat,
  GearFilter.Furniture,
  GearFilter.Lantern,
  GearFilter.Cooking,
];

// SR-4: 승계 카테고리를 이 화면의 8개 탭 중 하나로 해석한다(없으면 전체).
const resolveInitialCategory = (category?: string): GearFilter => {
  const matched = SEARCH_RANK_CATEGORY_FILTERS.find(
    filter => filter === category
  );

  return matched ?? GearFilter.All;
};

const SearchTopKeywordsView: FC<Props> = ({
  searchWarehouse,
  bag,
  showTitle = true,
  initialCategory,
}) => {
  const searchRank = searchWarehouse.getSearchRank();
  const [selectedCategory, setSelectedCategory] = useState<GearFilter>(() =>
    resolveInitialCategory(initialCategory)
  );
  // SR-4: 카테고리 칩 행을 진입 시 선택된 칩이 보이도록 가로 스크롤한다.
  const categoryScrollRef = useRef<ScrollView>(null);
  const didInitialScrollRef = useRef(false);
  const {
    showModal,
    selectedGear,
    isGearLoading,
    handleGearPress,
    handleAddPress,
    handleRemovePress,
    handleCloseModal,
  } = useSearchRankRowState(searchRank);
  const gears = searchRank.getGears();
  const isLoading = searchRank.isLoading();
  const l10n = app.getL10n();
  // 언어 전환 때 레지스트리 observable을 다시 읽어 라벨을 갱신한다.
  const categories: CategoryItem[] = SEARCH_RANK_CATEGORY_FILTERS.map(filter => ({
    filter,
    name: getGearFilterName(filter),
  }));

  useFocusEffect(
    useCallback(() => {
      searchRank.loadRanking(selectedCategory, false);
    }, [searchRank, selectedCategory])
  );

  const handleCategoryPress = (category: GearFilter) => {
    setSelectedCategory(category);
    searchRank.selectCategory(category);
  };

  // 진입 시 승계된 카테고리 칩이 화면 밖(오른쪽)에 있으면 그 칩이 보이도록 1회 스크롤한다.
  // 칩의 x 오프셋을 알아야 하므로 해당 칩의 onLayout에서 처리한다(전체는 이미 좌측이라 제외).
  const handleChipLayout =
    (category: GearFilter) => (event: LayoutChangeEvent) => {
      if (
        didInitialScrollRef.current ||
        category !== selectedCategory ||
        selectedCategory === GearFilter.All
      ) {
        return;
      }

      didInitialScrollRef.current = true;

      const { x } = event.nativeEvent.layout;

      categoryScrollRef.current?.scrollTo({
        x: Math.max(0, x - 16),
        animated: false,
      });
    };

  return (
    <View style={styles.container}>
      {showTitle ? (
        <PretendardText style={styles.title} weight='bold'>
          {l10n.t('search.rank.title')}
        </PretendardText>
      ) : null}

      {/* 카테고리 필터 */}
      <ScrollView
        ref={categoryScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScrollView}
        contentContainerStyle={styles.categoryScrollContent}
      >
        {categories.map(category => (
          <View
            key={category.filter}
            onLayout={handleChipLayout(category.filter)}
          >
            <CategoryChipView
              label={category.name}
              selected={selectedCategory === category.filter}
              onPress={() => handleCategoryPress(category.filter)}
            />
          </View>
        ))}
      </ScrollView>
      {/* 순위 리스트 */}
      <ScrollView
        style={styles.listScrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.listContainer}>
          {isLoading ? (
            // 검색 결과용 스켈레톤이 아니라 **순위 행 모양**을 비춘다(SR-4, 2026-08-13).
            <SearchRankSkeletonView count={10} />
          ) : gears.length === 0 ? (
            <View style={styles.emptyContainer}>
              <PretendardText style={styles.emptyText}>
                {l10n.t('search.rank.empty')}
              </PretendardText>
            </View>
          ) : (
            gears.map((gear, index) => (
              <SearchRankRowView
                key={gear.getId()}
                gear={gear}
                index={index}
                isLoading={isGearLoading(gear)}
                divided={index > 0}
                onPress={() => handleGearPress(gear)}
                onAddPress={e => handleAddPress(e, gear)}
                onRemovePress={e => handleRemovePress(e, gear)}
              />
            ))
          )}
        </View>
        <View style={styles.bottomContainer}></View>
      </ScrollView>
      {selectedGear && (
        <SearchGearAddToBagModalView
          visible={showModal}
          onClose={handleCloseModal}
          gear={selectedGear}
          bag={bag}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    ...AcgType.sectionTitle,
    color: Acg.ink,
    marginBottom: 12,
  },
  categoryScrollView: {
    // 고정 높이를 주면 칩(minHeight 34 + 테두리)이 잘린다 — 내용 높이에 맞추되 세로로 늘어나지 않게만 제한.
    flexGrow: 0,
    // 아래 리스트가 칩 밑으로 흘러 들어가므로 경계를 그어 스크롤 영역의 시작을 드러낸다.
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Acg.hairline,
  },
  categoryScrollContent: {
    flexDirection: 'row',
    gap: AcgLayout.chipGap,
  },
  listScrollView: {
    flex: 1,
  },
  listContainer: {
    paddingBottom: 20,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    ...AcgType.rowSubtitle,
    color: Color.textSecondary,
  },
  // 스크롤 끝 여백. 탭바가 없는 전용 화면이라 예전 100pt는 근거 없이 컸다.
  bottomContainer: {
    height: 24,
  },
});

export default observer(SearchTopKeywordsView);
