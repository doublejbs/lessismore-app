import { FC, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import Feed from '@/model/feed/Feed';
import { FeedBrandInterest } from '@/model/feed/FeedInterestProfile';
import { BROWSE_CATEGORIES } from '@/model/browse/BrowseCategory';
import CategoryChipView from '@/components/browse/CategoryChipView';
import FeedBrandSheetView from './FeedBrandSheetView';
import app from '@/model/app/App';

interface Props {
  feed: Feed;
}

const ALL_LABEL = '전체';

const BRAND_LABEL = '브랜드';

// FD-3: 피드 필터 바. 가로 스크롤 칩(전체 + 카테고리 11개 + 브랜드) + 브랜드 선택 바텀시트.
const FeedFilterBarView: FC<Props> = ({ feed }) => {
  const [sheetVisible, setSheetVisible] = useState(false);

  const selectedCategory = feed.getFilterCategory();
  const selectedBrand = feed.getFilterBrand();

  const handleSelectAll = () => {
    app.getAnalyticsManager()?.logClick('feed_category', { category: 'all' });
    feed.setFilterCategory(null);
  };

  const handleSelectCategory = (category: string) => {
    // 같은 칩 재탭 시 해제(전체로 복귀).
    const next = selectedCategory === category ? null : category;

    app
      .getAnalyticsManager()
      ?.logClick('feed_category', { category: next ?? 'all' });
    feed.setFilterCategory(next);
  };

  const handleOpenBrandSheet = () => {
    setSheetVisible(true);
  };

  const handleCloseBrandSheet = () => {
    setSheetVisible(false);
  };

  const handleSelectBrand = (brand: FeedBrandInterest | null) => {
    app
      .getAnalyticsManager()
      ?.logClick('feed_brand', { selected: brand !== null });
    feed.setFilterBrand(brand);
  };

  const brandLabel = selectedBrand
    ? selectedBrand.companyKorean || selectedBrand.company || BRAND_LABEL
    : BRAND_LABEL;

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
        style={styles.container}
      >
        <CategoryChipView
          label={ALL_LABEL}
          selected={selectedCategory === null}
          onPress={handleSelectAll}
        />
        <CategoryChipView
          label={brandLabel}
          selected={selectedBrand !== null}
          onPress={handleOpenBrandSheet}
        />
        {BROWSE_CATEGORIES.map(item => (
          <CategoryChipView
            key={item.filter}
            label={item.name}
            selected={selectedCategory === item.filter}
            onPress={() => handleSelectCategory(item.filter)}
          />
        ))}
      </ScrollView>

      <FeedBrandSheetView
        visible={sheetVisible}
        selectedBrand={selectedBrand}
        onClose={handleCloseBrandSheet}
        onSelect={handleSelectBrand}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 0,
  },
  content: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
});

export default observer(FeedFilterBarView);
