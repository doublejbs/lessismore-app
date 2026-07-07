import { FC, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import Feed from '@/model/feed/Feed';
import { toFeedSort, getFeedSortLabel } from '@/model/feed/FeedSort';
import { BROWSE_CATEGORIES } from '@/model/browse/BrowseCategory';
import { Color, Radius } from '@/constants/DesignTokens';
import PretendardText from '@/components/PretendardText';
import CategoryChipView from '@/components/browse/CategoryChipView';
import FeedFilterSheetView from './FeedFilterSheetView';
import FeedSortSheetView from './FeedSortSheetView';
import app from '@/model/app/App';

interface Props {
  feed: Feed;
}

const ALL_LABEL = '전체';

const BRAND_LABEL = '브랜드';

// FD-3: 피드 상단 고정 필터 바.
// 위계상 카테고리를 주 축(칩 행)으로 노출하고, 보조 축인 브랜드(진입 버튼)·정렬(드롭다운)은
// 그 아래 컨트롤 행에 둔다. 카테고리는 탭 즉시 적용, 브랜드/정렬은 각각 전용 시트로 진입한다.
const FeedFilterBarView: FC<Props> = ({ feed }) => {
  const [brandVisible, setBrandVisible] = useState(false);
  const [sortVisible, setSortVisible] = useState(false);

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

  const handleOpenSort = () => {
    app.getAnalyticsManager()?.logClick('feed_sort');
    setSortVisible(true);
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
      </View>

      <FeedFilterSheetView
        feed={feed}
        visible={brandVisible}
        onClose={() => setBrandVisible(false)}
      />
      <FeedSortSheetView
        feed={feed}
        visible={sortVisible}
        onClose={() => setSortVisible(false)}
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
    height: 32,
    paddingHorizontal: 14,
    borderRadius: Radius.chip,
    backgroundColor: Color.chipInactiveBg,
  },
  brandButtonActive: {
    backgroundColor: Color.chipActiveBg,
  },
  brandButtonText: {
    fontSize: 14,
    lineHeight: 16,
    color: Color.textPrimary,
  },
  brandButtonTextActive: {
    color: Color.background,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 32,
    paddingLeft: 12,
  },
  sortButtonText: {
    fontSize: 14,
    lineHeight: 16,
    color: Color.textPrimary,
  },
});

export default observer(FeedFilterBarView);
