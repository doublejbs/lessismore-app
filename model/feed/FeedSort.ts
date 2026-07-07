import BrowseSort from '@/model/search/BrowseSort';

// FD-3 정렬: `추천`(개인화 믹스, 기본)은 BrowseSort에 없는 개념이므로 별도 값으로 둔다.
// 나머지 4종은 BrowseSort replica 단일 정렬 목록에 매핑된다.
enum FeedSortRecommended {
  Recommended = 'recommended',
}

// Feed의 정렬 상태 타입. null 대신 명시적으로 다룰 때 사용한다.
// - Recommended: 개인화/필터 믹스(sort === null과 동치)
// - BrowseSort 4종: 해당 정렬 replica 단일 목록
export type FeedSort = FeedSortRecommended.Recommended | BrowseSort;

export const FEED_SORT_RECOMMENDED = FeedSortRecommended.Recommended;

export interface FeedSortOption {
  value: FeedSort;
  label: string;
}

// 시트 정렬 섹션 칩 순서·라벨(FD-3). `추천`이 기본(최상단).
export const FEED_SORT_OPTIONS: FeedSortOption[] = [
  { value: FeedSortRecommended.Recommended, label: '추천' },
  { value: BrowseSort.Popular, label: '인기순' },
  { value: BrowseSort.Latest, label: '최신순' },
  { value: BrowseSort.WeightAsc, label: '가벼운순' },
  { value: BrowseSort.WeightDesc, label: '무거운순' },
];

// Feed의 sort 상태(BrowseSort | null)를 FeedSort 값으로 변환한다(null=추천).
export const toFeedSort = (sort: BrowseSort | null): FeedSort => {
  return sort ?? FeedSortRecommended.Recommended;
};

// FeedSort 값을 Feed 상태(BrowseSort | null)로 변환한다(추천=null).
export const fromFeedSort = (feedSort: FeedSort): BrowseSort | null => {
  if (feedSort === FeedSortRecommended.Recommended) {
    return null;
  }

  return feedSort;
};

// 애널리틱스·디버깅용 정렬 라벨(추천/인기순/최신순/가벼운순/무거운순).
export const getFeedSortLabel = (feedSort: FeedSort): string => {
  const found = FEED_SORT_OPTIONS.find(option => option.value === feedSort);

  return found ? found.label : '추천';
};
