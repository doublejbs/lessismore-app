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
import {
  Acg,
  AcgFontSize,
  AcgLayout,
  AcgRow,
  Color,
} from '@/constants/DesignTokens';
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

/**
 * 추가·보유 버튼의 터치 여유(SR-4).
 *
 * 버튼은 28pt로 그리되 HIG 최소 타깃 44×44pt를 만족시켜야 한다 —
 * 시각 크기를 키우면 행이 버튼에 눌리므로 여유로만 확보한다. (44 − 28) / 2 = 8.
 */
const BUTTON_HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

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
                아직 등록된 장비가 없어요
              </PretendardText>
            </View>
          ) : (
            gears.map((gear, index) => (
              <Pressable
                key={gear.getId()}
                style={({ pressed }) => [
                  styles.rankItem,
                  index > 0 && styles.rankItemDivided,
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

                {/* 목록 행 문법(HM-8): 이름 + 메타 한 줄(`무게 · 브랜드`). 브랜드가 이름 위
                    작은 줄이던 것을 메타로 내렸다 — 위에 두면 순위·브랜드·이름 세 층이 된다. */}
                <View style={styles.gearInfo}>
                  <PretendardText
                    style={styles.gearName}
                    weight='medium'
                    numberOfLines={2}
                  >
                    {gear.getDisplayName()}
                  </PretendardText>
                  <PretendardText style={styles.gearMeta} numberOfLines={1}>
                    {[`${gear.getWeight()}g`, gear.getDisplayCompany()]
                      .filter(Boolean)
                      .join(' · ')}
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
                      // 체크 아이콘만으로는 "누르면 제거"가 드러나지 않는다(SR-4).
                      accessibilityRole='button'
                      accessibilityLabel={`${gear.getDisplayName()} 창고에서 제거`}
                      hitSlop={BUTTON_HIT_SLOP}
                    >
                      <Ionicons
                        name='checkmark'
                        size={16}
                        color={Color.textSecondary}
                      />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={e => handleAddPress(e, gear)}
                      accessibilityRole='button'
                      accessibilityLabel={`${gear.getDisplayName()} 창고에 추가`}
                      hitSlop={BUTTON_HIT_SLOP}
                    >
                      <Ionicons
                        name='add'
                        size={18}
                        color={Color.textPrimary}
                      />
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
    fontSize: AcgFontSize.sectionTitle,
    lineHeight: 26,
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
  /**
   * 레퍼런스 목록 행(HM-8) — 면 없이 지면에 놓고 행 사이 헤어라인으로 가른다.
   * 행마다 회색 면을 두던 것을 걷었다(2026-08-12): 면이 순위마다 반복되면 정작 순위 숫자와
   * 이름이 그 안에 갇혀 목록이 카드 나열로 읽힌다.
   */
  rankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: AcgRow.minHeight,
    paddingVertical: AcgRow.paddingVertical,
  },
  rankItemDivided: {
    borderTopWidth: 1,
    borderTopColor: Acg.hairline,
  },
  rankItemPressed: {
    backgroundColor: Acg.controlFill,
  },
  /**
   * 순위는 배지 원이 아니라 **숫자 그 자체**다. 상위 3위만 잉크 채움 원으로 세운다 —
   * 4위 이하까지 원을 두면 원이 목록의 리듬을 만들어 이름보다 먼저 읽힌다.
   */
  rankBadge: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankBadgeTop3: {
    borderRadius: 14,
    backgroundColor: Acg.ink,
  },
  rankNumber: {
    fontSize: AcgFontSize.rowSubtitle,
    color: Acg.textMuted,
  },
  rankNumberTop3: {
    color: Acg.paper,
  },
  gearInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  // 이름 + 메타 한 줄(브랜드·무게)로 묶는다 — 브랜드가 이름 위 작은 줄이던 것을 내렸다.
  gearName: {
    fontSize: AcgFontSize.rowTitle,
    lineHeight: 24,
    color: Acg.ink,
  },
  gearMeta: {
    fontSize: AcgFontSize.rowSubtitle,
    lineHeight: 20,
    color: Acg.ink,
  },
  buttonContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  /**
   * 보유 상태 배지(SR-4). **추가 버튼보다 약하다.**
   * 예전에는 검정 채움이라 이미 보유한 항목이 시선을 독점하고, 정작 눌러야 할 추가 버튼은
   * 행 배경과 같은 색이라 사라져 있었다 — 위계가 뒤집혀 있었다.
   */
  ownedBadge: {
    backgroundColor: Color.chipInactiveBg,
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 이 화면의 주 액션(SR-4). 행 배경(surfaceMuted)과 같은 색이면 버튼으로 보이지 않으므로
  // 흰 채움 + 테두리로 세운다.
  addButton: {
    backgroundColor: Color.background,
    borderWidth: 1,
    borderColor: Color.chipBorder,
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
  // 스크롤 끝 여백. 탭바가 없는 전용 화면이라 예전 100pt는 근거 없이 컸다.
  bottomContainer: {
    height: 24,
  },
});

export default observer(SearchTopKeywordsView);
