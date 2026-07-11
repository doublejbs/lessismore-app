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
import { Color, Radius } from '@/constants/DesignTokens';
import PretendardText from '@/components/PretendardText';
import CategoryChipView from '@/components/browse/CategoryChipView';
import FeedFilterSheetView from './FeedFilterSheetView';
import { setSortSheetContext } from '@/model/sort/SortSheetHandoff';
import app from '@/model/app/App';

interface Props {
  feed: Feed;
  // 검색 결과 화면(SR-1 검색 승계)에서는 정렬이 검색에 적용되지 않으므로 정렬 드롭다운을 숨긴다.
  showSort?: boolean;
}

const ALL_LABEL = '전체';

const BRAND_LABEL = '브랜드';

// FD-3: 피드 상단 고정 필터 바.
// 위계상 카테고리를 주 축(칩 행)으로 노출하고, 보조 축인 브랜드(진입 버튼)·정렬(드롭다운)은
// 그 아래 컨트롤 행에 둔다. 카테고리는 탭 즉시 적용, 브랜드/정렬은 각각 전용 시트로 진입한다.
const FeedFilterBarView: FC<Props> = ({ feed, showSort = true }) => {
  const router = useRouter();
  const [brandVisible, setBrandVisible] = useState(false);

  const currentCategory = feed.getFilterCategory();
  const currentSort = toFeedSort(feed.getSort());
  const brandCount = feed.getFilterBrands().length;

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
    <View style={styles.container}>
      <ScrollView
        horizontal={true}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRowContent}
      >
        <CategoryChipView
          label={ALL_LABEL}
          selected={currentCategory === null}
          onPress={handleSelectAllCategory}
        />
        {BROWSE_CATEGORIES.map(item => (
          <CategoryChipView
            key={item.filter}
            label={item.name}
            selected={currentCategory === item.filter}
            onPress={() => handleSelectCategory(item.filter)}
          />
        ))}
      </ScrollView>

      <View style={styles.controlRow}>
        <TouchableOpacity
          style={[styles.brandButton, brandActive && styles.brandButtonActive]}
          onPress={handleOpenBrand}
          activeOpacity={0.7}
        >
          <Ionicons
            name='options-outline'
            size={16}
            color={brandActive ? Color.background : Color.textPrimary}
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
            activeOpacity={0.7}
          >
            <PretendardText style={styles.sortButtonText} weight='medium'>
              {sortLabel}
            </PretendardText>
            <Ionicons
              name='chevron-down'
              size={16}
              color={Color.textSecondary}
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
  container: {
    paddingTop: 8,
    paddingBottom: 8,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Color.borderLight,
  },
  categoryRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  brandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 32,
    paddingHorizontal: 14,
    borderRadius: Radius.chip,
    borderWidth: 1,
    borderColor: Color.chipBorder,
    backgroundColor: Color.background,
  },
  brandButtonActive: {
    backgroundColor: Color.chipActiveBg,
    borderColor: Color.chipActiveBg,
  },
  brandButtonText: {
    fontSize: 14,
    color: Color.textPrimary,
  },
  brandButtonTextActive: {
    color: Color.background,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 32,
    paddingLeft: 12,
  },
  sortButtonText: {
    fontSize: 14,
    color: Color.textPrimary,
  },
});

export default observer(FeedFilterBarView);
