import { observer } from 'mobx-react-lite';
import { FC, useCallback, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  GestureResponderEvent,
  LayoutChangeEvent,
} from 'react-native';
import PretendardText from '@/components/PretendardText';
import {
  Liquid,
  LiquidLayout,
  LiquidRadius,
  LiquidShadow,
  LiquidType,
} from '@/constants/DesignTokens';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import SearchRankSkeletonView from './SearchRankSkeletonView';
import SearchRankRowView from './SearchRankRowView';
import GearFilter from '@/model/gear/GearFilter';
import { getGearFilterName } from '@/model/gear/GearFilterName';
import LiquidChip from '@/components/liquid/LiquidChip';
import Gear from '@/model/gear/Gear';
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

const categories: CategoryItem[] = SEARCH_RANK_CATEGORY_FILTERS.map(filter => {
  return { filter, name: getGearFilterName(filter) };
});

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
  const [loadingGearIds, setLoadingGearIds] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [selectedGear, setSelectedGear] = useState<Gear | null>(null);
  const gears = searchRank.getGears();
  const isLoading = searchRank.isLoading();

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

  const handleGearPress = (gear: Gear) => {
    app.getAnalyticsManager()?.logClick('search_rank_item');
    searchRank.goToGearDetail(gear);
  };

  const handleAddPress = async (e: GestureResponderEvent, gear: Gear) => {
    e.preventDefault();
    e.stopPropagation();

    setLoadingGearIds(prev => new Set(prev).add(gear.getId()));

    try {
      const success = await searchRank.registerSingle(gear);

      if (success) {
        app
          .getAnalyticsManager()
          ?.logClick('search_add', { target: 'warehouse' });
        setSelectedGear(gear);
        setShowModal(true);
      }
    } finally {
      setLoadingGearIds(prev => {
        const newSet = new Set(prev);

        newSet.delete(gear.getId());

        return newSet;
      });
    }
  };

  const handleRemovePress = async (e: GestureResponderEvent, gear: Gear) => {
    e.preventDefault();
    e.stopPropagation();

    setLoadingGearIds(prev => new Set(prev).add(gear.getId()));

    try {
      await searchRank.removeSingle(gear);
    } finally {
      setLoadingGearIds(prev => {
        const newSet = new Set(prev);

        newSet.delete(gear.getId());

        return newSet;
      });
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const renderRows = () => {
    if (isLoading) {
      return <SearchRankSkeletonView count={10} />;
    }

    if (gears.length === 0) {
      // 빈 상태는 사실 + 다음 걸음 두 줄.
      return (
        <View style={styles.emptyContainer}>
          <PretendardText weight='semibold' style={styles.emptyTitle}>
            아직 순위에 오른 장비가 없어요
          </PretendardText>
          <PretendardText style={styles.emptyText}>
            다른 카테고리를 둘러볼까요?
          </PretendardText>
        </View>
      );
    }

    // 두 번째 행부터 헤어라인으로 나눈다 — 카드 안에서는 면이 아니라 선이 구획을 맡는다.
    return gears.map((gear, index) => (
      <SearchRankRowView
        key={gear.getId()}
        gear={gear}
        rank={index + 1}
        loading={loadingGearIds.has(gear.getId())}
        divider={index > 0}
        onPress={handleGearPress}
        onAdd={handleAddPress}
        onRemove={handleRemovePress}
      />
    ));
  };

  return (
    <View style={styles.container}>
      {showTitle ? (
        <PretendardText style={styles.title} weight='bold'>
          인기 장비 순위
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
            <LiquidChip
              label={category.name}
              selected={selectedCategory === category.filter}
              onPress={() => handleCategoryPress(category.filter)}
            />
          </View>
        ))}
      </ScrollView>

      {/* 순위 리스트 — 한 장의 종이 카드 안에 행을 쌓는다. */}
      <ScrollView
        style={styles.listScrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* 그림자는 바깥 래퍼가 진다 — overflow:'hidden'과 같은 뷰에 두면 그림자까지 잘린다. */}
        <View style={styles.listCardShadow}>
          <View style={styles.listCard}>{renderRows()}</View>
        </View>
        <View style={styles.bottomContainer} />
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
    fontSize: LiquidType.title3.fontSize,
    lineHeight: LiquidType.title3.lineHeight,
    letterSpacing: LiquidType.title3.letterSpacing,
    color: Liquid.ink,
    marginBottom: 12,
  },
  categoryScrollView: {
    // 고정 높이를 주면 칩(minHeight 34 + 테두리)이 잘린다 — 내용 높이에 맞추되 세로로 늘어나지 않게만 제한.
    flexGrow: 0,
    // 경계선을 두지 않는다 — Liquid에서는 지면 위 카드가 구획을 맡는다.
    marginBottom: 14,
  },
  categoryScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listScrollView: {
    flex: 1,
  },
  listCardShadow: {
    borderRadius: LiquidRadius.card,
    boxShadow: LiquidShadow.card,
  },
  listCard: {
    borderRadius: LiquidRadius.card,
    backgroundColor: Liquid.surface,
    overflow: 'hidden',
  },
  emptyContainer: {
    paddingVertical: 40,
    paddingHorizontal: LiquidLayout.cardPad,
    alignItems: 'center',
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
  // 스크롤 끝 여백. 탭바가 없는 전용 화면이라 130까지 비우지 않는다.
  bottomContainer: {
    height: 24,
  },
});

export default observer(SearchTopKeywordsView);
