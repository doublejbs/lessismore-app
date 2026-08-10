import { FC, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Feed from '@/model/feed/Feed';
import {
  FeedSort,
  FEED_SORT_OPTIONS,
  toFeedSort,
  fromFeedSort,
  getFeedSortLabel,
} from '@/model/feed/FeedSort';
import { BROWSE_CATEGORIES } from '@/model/browse/BrowseCategory';
import { getFineCategoryLabel } from '@/model/gear/GearCategoryGroups';
import {
  Liquid,
  LiquidLayout,
  LiquidRadius,
  LiquidMotion,
} from '@/constants/DesignTokens';
import PretendardText from '@/components/PretendardText';
import LiquidChip from '@/components/liquid/LiquidChip';
import FeedFilterSheetView from './FeedFilterSheetView';
import { setSortSheetContext } from '@/model/sort/SortSheetHandoff';
import app from '@/model/app/App';

interface Props {
  feed: Feed;
  // 검색 결과 화면(SR-1 검색 승계)에서는 정렬이 검색에 적용되지 않으므로 정렬 드롭다운을 숨긴다.
  showSort?: boolean;
  // 칩 줄 위 여백 — 목업 §2 탐색은 16, §3 검색 결과는 14로 갈린다.
  topGap?: number;
}

const ALL_LABEL = '전체';

const BRAND_LABEL = '브랜드';

/**
 * 브랜드 버튼은 목업 §2대로 h32 아웃라인 칩이라 시각 높이를 키울 수 없다(같은 줄 칩 리듬이
 * 깨진다). 칩 프리미티브와 같은 방식으로 세로 여유만 얹어 44를 채운다: (44 − 32) / 2 = 6.
 * 가로는 0 — 옆 정렬 버튼과 겹친다.
 */
const BRAND_HIT_SLOP = { top: 6, bottom: 6, left: 0, right: 0 };

// FD-3: 피드 상단 고정 필터 바.
// 위계상 카테고리를 주 축(칩 행)으로 노출하고, 보조 축인 브랜드(진입 버튼)·정렬(드롭다운)은
// 그 아래 컨트롤 행에 둔다. 카테고리는 탭 즉시 적용, 브랜드/정렬은 각각 전용 시트로 진입한다.
const FeedFilterBarView: FC<Props> = ({
  feed,
  showSort = true,
  topGap = 16,
}) => {
  const router = useRouter();
  const [brandVisible, setBrandVisible] = useState(false);

  const currentCategory = feed.getFilterCategory();
  const currentSort = toFeedSort(feed.getSort());
  const brandCount = feed.getFilterBrands().length;
  const fineOptions = feed.getFineCategoryOptions();
  const fineCategory = feed.getFilterFineCategory();

  // FD-5: 카테고리 즉시 적용도 공통 `click_feed_filter_apply`로 관찰한다.
  const logApply = (category: string | null) => {
    app.getAnalyticsManager()?.logClick('feed_filter_apply', {
      category: category ?? 'all',
      brand_count: brandCount,
      sort: getFeedSortLabel(currentSort),
    });
  };

  const handleSelectAllCategory = () => {
    logApply(null);
    feed.selectCategory(null);
  };

  const handleSelectCategory = (filter: string) => {
    // 같은 칩 재탭 시 해제(전체로 복귀).
    const next = currentCategory === filter ? null : filter;
    logApply(next);
    feed.selectCategory(next);
  };

  const handleSelectAllFine = () => {
    app.getAnalyticsManager()?.logClick('feed_fine_filter', { category: 'all' });
    feed.selectFineCategory(null);
  };

  const handleSelectFine = (key: string) => {
    // 같은 세분 칩 재탭 시 해제(1차 그룹으로 복귀).
    const next = fineCategory === key ? null : key;
    app
      .getAnalyticsManager()
      ?.logClick('feed_fine_filter', { category: next ?? 'all' });
    feed.selectFineCategory(next);
  };

  const handleOpenBrand = () => {
    app.getAnalyticsManager()?.logClick('feed_brand');
    setBrandVisible(true);
  };

  // FD-3: 정렬 시트 진입 — 공용 formSheet 라우트로 위임한다.
  // 옵션·현재값·선택 콜백을 모듈 핸드오프에 넣고 push한다(FeedSortSheetView의 적용 로직 그대로 이관).
  const handleOpenSort = () => {
    app.getAnalyticsManager()?.logClick('feed_sort');
    setSortSheetContext({
      options: FEED_SORT_OPTIONS.map(option => ({
        key: option.value,
        label: option.label,
      })),
      selectedKey: currentSort,
      onSelect: key => {
        const value = key as FeedSort;

        app.getAnalyticsManager()?.logClick('feed_filter_apply', {
          category: feed.getFilterCategory() ?? 'all',
          brand_count: feed.getFilterBrands().length,
          sort: getFeedSortLabel(value),
        });
        feed.selectSort(fromFeedSort(value));
      },
    });
    router.push('/sort-sheet');
  };

  const brandActive = brandCount > 0;
  const brandLabel = brandActive ? `${BRAND_LABEL} ${brandCount}` : BRAND_LABEL;
  const sortLabel = getFeedSortLabel(currentSort);

  return (
    <View style={[styles.container, { paddingTop: topGap }]}>
      <ScrollView
        horizontal={true}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRowContent}
      >
        <LiquidChip
          label={ALL_LABEL}
          selected={currentCategory === null}
          onPress={handleSelectAllCategory}
        />
        {BROWSE_CATEGORIES.map(item => (
          <LiquidChip
            key={item.filter}
            label={item.name}
            selected={currentCategory === item.filter}
            onPress={() => handleSelectCategory(item.filter)}
          />
        ))}
      </ScrollView>

      {fineOptions.length > 0 ? (
        <ScrollView
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.fineCategoryRowContent}
        >
          <LiquidChip
            label={ALL_LABEL}
            size='sm'
            selected={fineCategory === null}
            onPress={handleSelectAllFine}
          />
          {fineOptions.map(key => (
            <LiquidChip
              key={key}
              label={getFineCategoryLabel(key)}
              size='sm'
              selected={fineCategory === key}
              onPress={() => handleSelectFine(key)}
            />
          ))}
        </ScrollView>
      ) : null}

      <View style={styles.controlRow}>
        <TouchableOpacity
          style={[styles.brandButton, brandActive && styles.brandButtonActive]}
          onPress={handleOpenBrand}
          activeOpacity={LiquidMotion.pressOpacity}
          hitSlop={BRAND_HIT_SLOP}
          accessibilityRole='button'
          accessibilityState={{ selected: brandActive }}
        >
          <Ionicons
            name='options-outline'
            size={16}
            color={brandActive ? Liquid.surface : Liquid.ink}
          />
          <PretendardText
            style={[
              styles.brandButtonText,
              brandActive && styles.brandButtonTextActive,
            ]}
            weight='medium'
          >
            {brandLabel}
          </PretendardText>
        </TouchableOpacity>

        {showSort ? (
          <TouchableOpacity
            style={styles.sortButton}
            onPress={handleOpenSort}
            activeOpacity={LiquidMotion.pressOpacity}
          >
            <PretendardText style={styles.sortButtonText} weight='medium'>
              {sortLabel}
            </PretendardText>
            <Ionicons
              name='chevron-down'
              size={15}
              color={Liquid.inkMuted}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      <FeedFilterSheetView
        feed={feed}
        visible={brandVisible}
        onClose={() => setBrandVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  // 구분 헤어라인을 두지 않는다 — Liquid에서는 지면 위 카드가 구획을 맡는다.
  container: {
    gap: 14,
  },
  categoryRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: LiquidLayout.screenH,
  },
  fineCategoryRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: LiquidLayout.screenH,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: LiquidLayout.screenH,
  },
  // 브랜드 필터는 h32 아웃라인 칩 — 칩 줄과 같은 알약이되 한 단계 낮은 위계다.
  brandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 32,
    paddingHorizontal: 14,
    borderRadius: LiquidRadius.pill,
    borderWidth: 0.5,
    borderColor: Liquid.chipStroke,
    backgroundColor: Liquid.chipFill,
  },
  brandButtonActive: {
    backgroundColor: Liquid.ink,
    borderColor: Liquid.ink,
  },
  brandButtonText: {
    fontSize: 13.5,
    color: Liquid.ink,
  },
  brandButtonTextActive: {
    color: Liquid.surface,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: LiquidLayout.touchMin,
    paddingLeft: 12,
  },
  sortButtonText: {
    fontSize: 13.5,
    color: Liquid.ink,
  },
});

export default observer(FeedFilterBarView);
