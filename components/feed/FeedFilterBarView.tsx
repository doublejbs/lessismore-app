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
import { Acg, AcgFontSize, AcgLayout } from '@/constants/DesignTokens';
import PretendardText from '@/components/PretendardText';
import FeedChipView from './FeedChipView';
import FeedFilterSheetView from './FeedFilterSheetView';
import { setSortSheetContext } from '@/model/sort/SortSheetHandoff';
import app from '@/model/app/App';

interface Props {
  feed: Feed;
  // 검색 결과 화면(SR-1 검색 승계)에서는 정렬이 검색에 적용되지 않으므로 정렬 줄을 숨긴다.
  showSort?: boolean;
}

const ALL_LABEL = '전체';

const BRAND_LABEL = '브랜드';

// 필터 칩의 좌측 아이콘(가로선 3줄 + 점) · 정렬 셰브론.
const FILTER_ICON_SIZE = 18;

const CHEVRON_SIZE = 16;

// FD-3: 탐색 탭 필터 바(레퍼런스 이식, 2026-08-11).
// 한 줄 가로 스크롤 칩 행 — **필터 시트를 여는 칩이 맨 앞**이고 그 뒤로 카테고리 칩이 이어진다.
// 정렬은 칩 행이 아니라 그 아래 우측 정렬 줄(면 없음)에 둔다.
const FeedFilterBarView: FC<Props> = ({ feed, showSort = true }) => {
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
    app
      .getAnalyticsManager()
      ?.logClick('feed_fine_filter', { category: 'all' });
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
  // 옵션·현재값·선택 콜백을 모듈 핸드오프에 넣고 push한다.
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
        contentContainerStyle={styles.chipRowContent}
      >
        <FeedChipView
          label={brandLabel}
          selected={brandActive}
          onPress={handleOpenBrand}
          leadingIcon={
            <Ionicons
              name='options-outline'
              size={FILTER_ICON_SIZE}
              color={brandActive ? Acg.paper : Acg.ink}
            />
          }
          accessibilityLabel={`${brandLabel} 필터`}
        />
        <FeedChipView
          label={ALL_LABEL}
          selected={currentCategory === null}
          onPress={handleSelectAllCategory}
        />
        {BROWSE_CATEGORIES.map(item => (
          <FeedChipView
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
          contentContainerStyle={styles.chipRowContent}
        >
          <FeedChipView
            label={ALL_LABEL}
            compact={true}
            selected={fineCategory === null}
            onPress={handleSelectAllFine}
          />
          {fineOptions.map(key => (
            <FeedChipView
              key={key}
              label={getFineCategoryLabel(key)}
              compact={true}
              selected={fineCategory === key}
              onPress={() => handleSelectFine(key)}
            />
          ))}
        </ScrollView>
      ) : null}

      {showSort ? (
        // 레퍼런스의 `개수 + 정렬` 줄. 피드는 총 건수를 알 수 없어(무한 스크롤 인터리브)
        // 좌측 개수를 두지 않고 정렬만 우측에 둔다 — 추측한 수를 표시하지 않는다.
        <View style={styles.sortRow}>
          <TouchableOpacity
            style={styles.sortButton}
            onPress={handleOpenSort}
            activeOpacity={0.7}
            accessibilityRole='button'
            accessibilityLabel={`정렬 ${sortLabel}`}
          >
            <PretendardText style={styles.sortLabel}>
              {sortLabel}
            </PretendardText>
            <Ionicons name='chevron-down' size={CHEVRON_SIZE} color={Acg.ink} />
          </TouchableOpacity>
        </View>
      ) : null}

      <FeedFilterSheetView
        feed={feed}
        visible={brandVisible}
        onClose={() => setBrandVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  // 면·헤어라인 없이 순백 지면에 그대로 놓인다(레퍼런스).
  container: {
    gap: 10,
  },
  chipRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AcgLayout.chipGap,
    // 콘텐츠가 화면 끝까지 흐르게 두고 페이드 마스크를 두지 않는다 — 레퍼런스는 그냥 잘린다.
    paddingHorizontal: AcgLayout.screenPadding,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: AcgLayout.screenPadding,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    // 아이콘 옆 라벨만으로는 터치 타깃이 얕아 최소 높이를 확보한다.
    minHeight: 44,
    paddingLeft: 12,
  },
  sortLabel: {
    fontSize: AcgFontSize.control,
    color: Acg.ink,
  },
});

export default observer(FeedFilterBarView);
