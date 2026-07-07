import GearFilter from '@/model/gear/GearFilter';
import { getGearFilterName } from '@/model/gear/GearFilterName';

export interface BrowseCategoryItem {
  filter: GearFilter;
  name: string;
}

// 탐색 홈 카테고리 그리드에서 노출할 카테고리 목록(전체 제외).
// 표시명은 GearFilterName의 캐논컬 매핑에서 파생한다.
const BROWSE_CATEGORY_FILTERS: GearFilter[] = [
  GearFilter.Tent,
  GearFilter.SleepingBag,
  GearFilter.Backpack,
  GearFilter.Clothing,
  GearFilter.Mat,
  GearFilter.Furniture,
  GearFilter.Lantern,
  GearFilter.Cooking,
  GearFilter.Electronic,
  GearFilter.Food,
  GearFilter.Etc,
];

const BROWSE_CATEGORIES: BrowseCategoryItem[] = BROWSE_CATEGORY_FILTERS.map(
  filter => {
    return { filter, name: getGearFilterName(filter) };
  }
);

const getBrowseCategoryName = (filter: string): string => {
  return getGearFilterName(filter as GearFilter);
};

export { BROWSE_CATEGORIES, getBrowseCategoryName };
