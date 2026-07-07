import GearFilter from '@/model/gear/GearFilter';

export interface BrowseCategoryItem {
  filter: GearFilter;
  name: string;
}

// 탐색 홈 카테고리 그리드에서 노출할 카테고리 목록(전체 제외).
// 표시명은 CustomGearCategory와 동일한 매핑을 사용한다.
const BROWSE_CATEGORIES: BrowseCategoryItem[] = [
  { filter: GearFilter.Tent, name: '텐트' },
  { filter: GearFilter.SleepingBag, name: '침낭' },
  { filter: GearFilter.Backpack, name: '배낭' },
  { filter: GearFilter.Clothing, name: '의류' },
  { filter: GearFilter.Mat, name: '매트' },
  { filter: GearFilter.Furniture, name: '가구' },
  { filter: GearFilter.Lantern, name: '랜턴' },
  { filter: GearFilter.Cooking, name: '조리' },
  { filter: GearFilter.Electronic, name: '전자기기' },
  { filter: GearFilter.Food, name: '음식' },
  { filter: GearFilter.Etc, name: '기타' },
];

const getBrowseCategoryName = (filter: string): string => {
  const found = BROWSE_CATEGORIES.find(category => {
    return category.filter === filter;
  });

  return found ? found.name : filter;
};

export { BROWSE_CATEGORIES, getBrowseCategoryName };
