import { observer } from 'mobx-react-lite';
import { FC, useCallback, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  TouchableOpacity,
  GestureResponderEvent,
  LayoutChangeEvent,
} from 'react-native';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import SearchSkeletonView from './SearchSkeletonView';
import GearFilter from '@/model/gear/GearFilter';
import { getGearFilterName } from '@/model/gear/GearFilterName';
import CategoryChipView from '../browse/CategoryChipView';
import { Ionicons } from '@expo/vector-icons';
import LoadingView from '../ui/LoadingView';
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
  const handleChipLayout = (category: GearFilter) => (event: LayoutChangeEvent) => {
    if (
      didInitialScrollRef.current ||
      category !== selectedCategory ||
      selectedCategory === GearFilter.All
    ) {
      return;
    }

    didInitialScrollRef.current = true;

    const { x } = event.nativeEvent.layout;

    categoryScrollRef.current?.scrollTo({ x: Math.max(0, x - 16), animated: false });
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
            <SearchSkeletonView count={10} />
          ) : gears.length === 0 ? (
            <View style={styles.emptyContainer}>
              <PretendardText style={styles.emptyText}>
                아직 등록된 장비가 없습니다
              </PretendardText>
            </View>
          ) : (
            gears.map((gear, index) => (
              <Pressable
                key={gear.getId()}
                style={({ pressed }) => [
                  styles.rankItem,
                  pressed && styles.rankItemPressed,
                ]}
                onPress={() => handleGearPress(gear)}
              >
                <View
                  style={[styles.rankBadge, index < 3 && styles.rankBadgeTop3]}
                >
                  <PretendardText
                    style={[
                      styles.rankNumber,
                      index < 3 && styles.rankNumberTop3,
                    ]}
                    weight='bold'
                  >
                    {index + 1}
                  </PretendardText>
                </View>

                <View style={styles.gearInfo}>
                  {gear.getCompany() && (
                    <PretendardText
                      style={styles.gearCompany}
                      numberOfLines={1}
                    >
                      {gear.getCompany()}
                    </PretendardText>
                  )}
                  <PretendardText
                    style={styles.gearName}
                    weight='semibold'
                    numberOfLines={1}
                  >
                    {gear.getDisplayName()}
                  </PretendardText>
                  <PretendardText style={styles.gearCount}>
                    {gear.getWeight()}g
                  </PretendardText>
                </View>

                <View style={styles.buttonContainer}>
                  {loadingGearIds.has(gear.getId()) ? (
                    <View style={styles.loadingContainer}>
                      <LoadingView duration={1000} />
                    </View>
                  ) : gear.isAdded() ? (
                    <TouchableOpacity
                      style={styles.ownedBadge}
                      onPress={e => handleRemovePress(e, gear)}
                    >
                      <Ionicons
                        name='checkmark'
                        size={16}
                        color={Color.background}
                      />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={e => handleAddPress(e, gear)}
                    >
                      <Ionicons name='add' size={16} color={Color.textPrimary} />
                    </TouchableOpacity>
                  )}
                </View>
              </Pressable>
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
    fontSize: 18,
    color: Color.textPrimary,
    marginBottom: 12,
  },
  categoryScrollView: {
    // 고정 높이를 주면 칩(minHeight 34 + 테두리)이 잘린다 — 내용 높이에 맞추되 세로로 늘어나지 않게만 제한.
    flexGrow: 0,
    marginBottom: 12,
  },
  categoryScrollContent: {
    flexDirection: 'row',
    gap: 8,
  },
  listScrollView: {
    flex: 1,
  },
  listContainer: {
    gap: 8,
    paddingBottom: 20,
  },
  rankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: Color.surfaceMuted,
    borderRadius: Radius.card,
  },
  rankItemPressed: {
    backgroundColor: Color.thumbBg,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Color.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankBadgeTop3: {
    backgroundColor: Color.chipActiveBg,
  },
  rankNumber: {
    fontSize: 13,
    color: Color.textTertiary,
  },
  rankNumberTop3: {
    color: Color.background,
  },
  gearInfo: {
    flex: 1,
    gap: 2,
  },
  gearCompany: {
    fontSize: 11,
    color: Color.textSecondary,
  },
  gearName: {
    fontSize: 15,
    color: Color.textPrimary,
  },
  gearCount: {
    fontSize: 12,
    color: Color.textTertiary,
  },
  buttonContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownedBadge: {
    backgroundColor: Color.chipActiveBg,
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    backgroundColor: Color.surfaceMuted,
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Color.textSecondary,
  },
  bottomContainer: {
    height: 100,
  },
});

export default observer(SearchTopKeywordsView);
