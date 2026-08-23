import GearFilter from '@/model/gear/GearFilter';
import { getAppTranslation } from '@/model/l10n/L10nRegistry';

// GearFilter → Firestore·비교에 쓰는 캐논컬 값 매핑.
// 표시명은 아래 키 매핑을 통해서만 가져온다 — 언어가 바뀌어도 값은 불변이다.
const GEAR_FILTER_NAMES: Record<GearFilter, string> = {
  [GearFilter.All]: '전체', // l10n-ignore: 카테고리 캐논컬 표시 폴백 값
  [GearFilter.Tent]: '텐트', // l10n-ignore: 카테고리 캐논컬 표시 폴백 값
  [GearFilter.SleepingBag]: '침낭', // l10n-ignore: 카테고리 캐논컬 표시 폴백 값
  [GearFilter.Backpack]: '배낭', // l10n-ignore: 카테고리 캐논컬 표시 폴백 값
  [GearFilter.Clothing]: '의류', // l10n-ignore: 카테고리 캐논컬 표시 폴백 값
  [GearFilter.Mat]: '매트', // l10n-ignore: 카테고리 캐논컬 표시 폴백 값
  [GearFilter.Furniture]: '가구', // l10n-ignore: 카테고리 캐논컬 표시 폴백 값
  [GearFilter.Lantern]: '랜턴', // l10n-ignore: 카테고리 캐논컬 표시 폴백 값
  [GearFilter.Cooking]: '조리', // l10n-ignore: 카테고리 캐논컬 표시 폴백 값
  [GearFilter.Electronic]: '전자기기', // l10n-ignore: 카테고리 캐논컬 표시 폴백 값
  [GearFilter.Food]: '음식', // l10n-ignore: 카테고리 캐논컬 표시 폴백 값
  [GearFilter.Etc]: '기타', // l10n-ignore: 카테고리 캐논컬 표시 폴백 값
};

const GEAR_FILTER_NAME_KEYS: Record<GearFilter, string> = {
  [GearFilter.All]: 'category.all',
  [GearFilter.Tent]: 'category.tent',
  [GearFilter.SleepingBag]: 'category.sleepingBag',
  [GearFilter.Backpack]: 'category.backpack',
  [GearFilter.Clothing]: 'category.clothing',
  [GearFilter.Mat]: 'category.mat',
  [GearFilter.Furniture]: 'category.furniture',
  [GearFilter.Lantern]: 'category.lantern',
  [GearFilter.Cooking]: 'category.cooking',
  [GearFilter.Electronic]: 'category.electronic',
  [GearFilter.Food]: 'category.food',
  [GearFilter.Etc]: 'category.etc',
};

const getGearFilterCanonicalName = (filter: GearFilter): string => {
  return GEAR_FILTER_NAMES[filter] ?? filter;
};

const getGearFilterName = (filter: GearFilter): string => {
  const key = GEAR_FILTER_NAME_KEYS[filter];

  return key ? getAppTranslation(key) : getGearFilterCanonicalName(filter);
};

export {
  GEAR_FILTER_NAMES,
  GEAR_FILTER_NAME_KEYS,
  getGearFilterCanonicalName,
  getGearFilterName,
};
