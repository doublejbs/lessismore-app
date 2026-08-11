import { FC, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { observer } from 'mobx-react-lite';
import { LinearGradient } from 'expo-linear-gradient';
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
import { Liquid, LiquidBackdrop, LiquidLayout } from '@/constants/DesignTokens';
import LiquidChip from '@/components/liquid/LiquidChip';
import FeedFilterSheetView from './FeedFilterSheetView';
import { setSortSheetContext } from '@/model/sort/SortSheetHandoff';
import app from '@/model/app/App';

interface Props {
  feed: Feed;
  // 검색 결과 화면(SR-1 검색 승계)에서는 정렬이 검색에 적용되지 않으므로 정렬 칩을 숨긴다.
  showSort?: boolean;
  /**
   * `인기 순위` 진입 칩. 탐색 피드에만 둔다 — 장비 추가 검색 모달·검색 결과는 그 화면이
   * 맡은 일이 있어 다른 화면으로 나가는 길을 필터 줄에 섞지 않는다.
   */
  showRanking?: boolean;
  /**
   * 결과 0건 축약(SR-2). 칩 두 줄이 그대로 남으면 아무것도 안 걸리는 필터를 계속 만지게 된다 —
   * **선택된 칩만** 남겨 한 줄로 줄이고 세분 칩 줄은 접는다. 완전히 숨기지 않는 이유는
   * 0건을 만든 필터를 풀 길이 화면에서 사라지면 안 되기 때문이다.
   */
  collapsed?: boolean;
  // 칩 줄 위 여백 — 목업 §2 탐색은 16, §3 검색 결과는 12로 갈린다.
  topGap?: number;
}

const ALL_LABEL = '전체';

const BRAND_LABEL = '브랜드';

const RANKING_LABEL = '인기 순위';

// 컨트롤 칩(브랜드·정렬·인기 순위)도 카테고리 칩과 같은 h34 알약이라 구분선 키를 여기에 맞춘다.
const CHIP_HEIGHT = 34;

// FD-3: 피드 상단 고정 필터 바 — **한 줄**이다.
// 카테고리 칩(주 축)과 컨트롤 칩(브랜드·정렬·인기 순위)을 같은 가로 스크롤에 세로 헤어라인으로
// 나눠 담는다. 제목 + 검색 필드 + 칩 줄 + 컨트롤 줄 4단이던 시절엔 첫 화면에 카드가 1.5행뿐이었다
// (2026-08-11 디자인 리뷰: 콘텐츠 시작점 y≈288). 줄을 하나 줄여 그만큼을 그리드에 돌려준다.
const FeedFilterBarView: FC<Props> = ({
  feed,
  showSort = true,
  showRanking = false,
  collapsed = false,
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

  // SR-4: 현재 선택된 카테고리를 순위 화면으로 승계한다(그룹 카테고리 기준).
  const handleGoToRanking = () => {
    app.getAnalyticsManager()?.logClick('feed_ranking');

    const category = feed.getFilterCategory();

    if (category) {
      router.push(`/popular-ranking?category=${category}`);
    } else {
      router.push('/popular-ranking');
    }
  };

  const brandActive = brandCount > 0;
  const brandLabel = brandActive ? `${BRAND_LABEL} ${brandCount}` : BRAND_LABEL;
  const sortLabel = getFeedSortLabel(currentSort);
  // 0건 축약: `전체`와 지금 걸린 카테고리만 남긴다.
  const visibleCategories = collapsed
    ? BROWSE_CATEGORIES.filter(item => item.filter === currentCategory)
    : BROWSE_CATEGORIES;

  /**
   * 가로 스크롤 줄의 우측 끝 페이드. 칩이 화면 가장자리에서 그냥 잘리면 스크롤 가능이 아니라
   * 레이아웃이 깨진 것처럼 보인다(2026-08-11 디자인 리뷰) — 지면색으로 흘려 보낸다.
   */
  const renderEdgeFade = () => {
    return (
      <LinearGradient
        colors={LiquidBackdrop.edgeFade.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.edgeFade}
        pointerEvents='none'
      />
    );
  };

  return (
    <View style={[styles.container, { paddingTop: topGap }]}>
      <View style={styles.rowWrap}>
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
          {visibleCategories.map(item => (
            <LiquidChip
              key={item.filter}
              label={item.name}
              selected={currentCategory === item.filter}
              onPress={() => handleSelectCategory(item.filter)}
            />
          ))}

          {/* 필터 축(카테고리)과 컨트롤을 세로 헤어라인으로 나눈다 — 같은 줄에 섞여 있어도
              고르는 것과 여는 것이 갈려 읽힌다. */}
          <View style={styles.groupDivider} />

          {/* 컨트롤도 카테고리와 **같은 칩 프리미티브**다 — `브랜드`는 알약, 정렬은 맨
              텍스트였어서 같은 역할인데 형태가 갈렸고 정렬은 탭 영역이 보이지 않았다
              (2026-08-11 리뷰). 뒤 글리프로 무엇을 여는 칩인지 구분한다. */}
          <LiquidChip
            label={brandLabel}
            selected={brandActive}
            trailingIcon='options-outline'
            onPress={handleOpenBrand}
          />

          {showSort ? (
            <LiquidChip
              label={sortLabel}
              trailingIcon='chevron-down'
              onPress={handleOpenSort}
            />
          ) : null}

          {showRanking ? (
            // 필터가 아니라 다른 화면으로 나가는 칩이라 쉐브론이 옆을 가리킨다.
            <LiquidChip
              label={RANKING_LABEL}
              trailingIcon='chevron-forward'
              onPress={handleGoToRanking}
            />
          ) : null}
        </ScrollView>
        {renderEdgeFade()}
      </View>

      {fineOptions.length > 0 && !collapsed ? (
        <View style={styles.rowWrap}>
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
          {renderEdgeFade()}
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
  // 구분 헤어라인을 두지 않는다 — Liquid에서는 지면 위 카드가 구획을 맡는다.
  container: {
    gap: 10,
  },
  // 스크롤 줄과 페이드 마스크를 겹쳐 두는 껍데기.
  rowWrap: {
    position: 'relative',
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
  groupDivider: {
    width: StyleSheet.hairlineWidth,
    height: CHIP_HEIGHT - 12,
    marginHorizontal: 4,
    backgroundColor: Liquid.hairlineStrong,
  },
  edgeFade: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: LiquidBackdrop.edgeFade.width,
  },
});

export default observer(FeedFilterBarView);
