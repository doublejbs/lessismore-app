import GearFilter from '@/model/gear/GearFilter';

// GearFilter → 한글 표시명 캐논컬 매핑.
// 탐색 홈 카테고리 그리드·인기순위 카테고리 탭·기타 카테고리 표시가 모두 이 소스를 참조한다.
// FilterManager / CustomGearCategory 등 기존 인스턴스 기반 정의와 값이 일치해야 한다.
const GEAR_FILTER_NAMES: Record<GearFilter, string> = {
  [GearFilter.All]: '전체',
  [GearFilter.Tent]: '텐트',
  [GearFilter.SleepingBag]: '침낭',
  [GearFilter.Backpack]: '배낭',
  [GearFilter.Clothing]: '의류',
  [GearFilter.Mat]: '매트',
  [GearFilter.Furniture]: '가구',
  [GearFilter.Lantern]: '랜턴',
  [GearFilter.Cooking]: '조리',
  [GearFilter.Electronic]: '전자기기',
  [GearFilter.Food]: '음식',
  [GearFilter.Etc]: '기타',
};

const getGearFilterName = (filter: GearFilter): string => {
  return GEAR_FILTER_NAMES[filter] ?? filter;
};

export { GEAR_FILTER_NAMES, getGearFilterName };
