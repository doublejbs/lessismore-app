import BrowseSort from '@/model/search/BrowseSort';

export interface BrowseSortItem {
  sort: BrowseSort;
  name: string;
}

const BROWSE_SORT_OPTIONS: BrowseSortItem[] = [
  { sort: BrowseSort.Popular, name: '인기순' }, // l10n-ignore: 사용하지 않는 레거시 정렬 라벨
  { sort: BrowseSort.Latest, name: '최신순' }, // l10n-ignore: 사용하지 않는 레거시 정렬 라벨
  { sort: BrowseSort.WeightAsc, name: '가벼운순' }, // l10n-ignore: 사용하지 않는 레거시 정렬 라벨
  { sort: BrowseSort.WeightDesc, name: '무거운순' }, // l10n-ignore: 사용하지 않는 레거시 정렬 라벨
];

const getBrowseSortName = (sort: BrowseSort): string => {
  const found = BROWSE_SORT_OPTIONS.find(option => {
    return option.sort === sort;
  });

  return found ? found.name : '인기순'; // l10n-ignore: 사용하지 않는 레거시 정렬 라벨
};

export { BROWSE_SORT_OPTIONS, getBrowseSortName };
