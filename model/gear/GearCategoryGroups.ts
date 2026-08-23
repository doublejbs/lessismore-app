import GearFilter from './GearFilter';
import { getAppTranslation } from '../l10n/L10nRegistry';

// DM-4: 1차 그룹(GearFilter) → 세분 카테고리 키 매핑.
// 웹 크롤 파이프라인(lessismore 레포 specs-schema.js)이 gear.category에 세분 키를 저장하고,
// 앱의 GearFilter 11개는 이 세분 키들의 그룹으로 동작한다.
// 레거시 그룹 키 자신도 멤버로 포함한다(구 데이터 호환).
export const GROUP_MEMBERS: Partial<Record<GearFilter, string[]>> = {
  [GearFilter.Tent]: ['tent', 'tarp', 'shelter', 'tent_acc'],
  [GearFilter.SleepingBag]: ['sleeping_bag'],
  [GearFilter.Mat]: ['mat', 'pillow'],
  [GearFilter.Backpack]: ['backpack', 'vest_pack', 'backpack_cover', 'pouch'],
  [GearFilter.Clothing]: ['clothing', 'gloves', 'gaiter', 'sunglasses'],
  // 'furniture'는 세분 카테고리에서 뺐지만(DM-4) 그룹 멤버로는 남긴다 — lantern과 같은 이유.
  [GearFilter.Furniture]: ['furniture', 'chair', 'table', 'furniture_etc'],
  // 'lantern'은 세분 카테고리에서 뺐지만(DM-4, 2026-08-09) 그룹 멤버로는 남긴다 —
  // 커스텀 장비 등록이 아직 이 키를 저장하므로 빼면 랜턴 필터에서 빠져 기타로 떨어진다.
  [GearFilter.Lantern]: ['lantern', 'lighting', 'headlamp'],
  // 'cooking'도 마찬가지로 세분에서만 빼고 그룹 멤버로는 남긴다.
  [GearFilter.Cooking]: [
    'cooking',
    'cookware',
    'stove',
    'torch',
    'cup',
    'bowl',
    'cookware_etc',
    'cutlery',
    'bottle',
  ],
  [GearFilter.Electronic]: ['electronic'],
  [GearFilter.Food]: ['food'],
  [GearFilter.Etc]: [
    'etc',
    'towel',
    'hand_warmer',
    'shovel',
    'hammer',
    'microspikes',
    'trekking_pole',
  ],
};

// 세분 카테고리 → 그룹 역매핑 (모듈 로드 시 1회 구성).
const CATEGORY_TO_GROUP: Record<string, GearFilter> = Object.entries(
  GROUP_MEMBERS
).reduce<Record<string, GearFilter>>((acc, [group, members]) => {
  members.forEach(member => {
    acc[member] = group as GearFilter;
  });

  return acc;
}, {});

// 그룹 필터의 세분 카테고리 멤버 배열. All은 필터 전용이므로 빈 배열.
export const getGroupMembers = (filter: GearFilter): string[] => {
  return GROUP_MEMBERS[filter] ?? [];
};

// 세분 카테고리 키를 1차 그룹으로 매핑한다. 미지의 키는 etc 그룹으로 폴백(DM-4).
export const getGroupForCategory = (category: string): GearFilter => {
  return CATEGORY_TO_GROUP[category] ?? GearFilter.Etc;
};

// 세분 카테고리 한글 라벨 — 웹 CATEGORY_LABELS와 동일하게 유지한다(DM-4).
// 레거시 그룹 키(electronic) 라벨도 포함.
export const FINE_CATEGORY_LABELS: Record<string, string> = {
  backpack: '배낭', // l10n-ignore: 세분 카테고리 캐논컬 표시 폴백 값
  vest_pack: '베스트 배낭', // l10n-ignore: 세분 카테고리 캐논컬 표시 폴백 값
  backpack_cover: '배낭 커버', // l10n-ignore: 세분 카테고리 캐논컬 표시 폴백 값
  tent: '텐트', // l10n-ignore: 세분 카테고리 캐논컬 표시 폴백 값
  tarp: '타프', // l10n-ignore: 세분 카테고리 캐논컬 표시 폴백 값
  shelter: '쉘터', // l10n-ignore: 세분 카테고리 캐논컬 표시 폴백 값
  tent_acc: '텐트ACC', // l10n-ignore: 세분 카테고리 캐논컬 표시 폴백 값
  sleeping_bag: '침낭', // l10n-ignore: 세분 카테고리 캐논컬 표시 폴백 값
  mat: '매트', // l10n-ignore: 세분 카테고리 캐논컬 표시 폴백 값
  pillow: '필로우', // l10n-ignore: 세분 카테고리 캐논컬 표시 폴백 값
  cup: '컵', // l10n-ignore: 세분 카테고리 캐논컬 표시 폴백 값
  bowl: '그릇', // l10n-ignore: 세분 카테고리 캐논컬 표시 폴백 값
  cutlery: '수저', // l10n-ignore: 세분 카테고리 캐논컬 표시 폴백 값
  stove: '버너', // l10n-ignore: 세분 카테고리 캐논컬 표시 폴백 값
  torch: '토치', // l10n-ignore: 세분 카테고리 캐논컬 표시 폴백 값
  bottle: '물통', // l10n-ignore: 세분 카테고리 캐논컬 표시 폴백 값
  cookware: '코펠·쿡웨어', // l10n-ignore: 세분 카테고리 캐논컬 표시 폴백 값
  cookware_etc: '식기류 기타', // l10n-ignore: 세분 카테고리 캐논컬 표시 폴백 값
  chair: '체어', // l10n-ignore: 세분 카테고리 캐논컬 표시 폴백 값
  table: '테이블', // l10n-ignore: 세분 카테고리 캐논컬 표시 폴백 값
  furniture_etc: '그 외 기타', // l10n-ignore: 세분 카테고리 캐논컬 표시 폴백 값
  clothing: '일반', // l10n-ignore: 세분 카테고리 캐논컬 표시 폴백 값
  sunglasses: '선글라스', // l10n-ignore: 세분 카테고리 캐논컬 표시 폴백 값
  gaiter: '스패츠', // l10n-ignore: 세분 카테고리 캐논컬 표시 폴백 값
  gloves: '장갑', // l10n-ignore: 세분 카테고리 캐논컬 표시 폴백 값
  lighting: '조명', // l10n-ignore: 세분 카테고리 캐논컬 표시 폴백 값
  headlamp: '헤드랜턴', // l10n-ignore: 세분 카테고리 캐논컬 표시 폴백 값
  food: '식품', // l10n-ignore: 세분 카테고리 캐논컬 표시 폴백 값
  towel: '수건', // l10n-ignore: 세분 카테고리 캐논컬 표시 폴백 값
  pouch: '파우치/수납가방', // l10n-ignore: 세분 카테고리 캐논컬 표시 폴백 값
  hand_warmer: '핫팩', // l10n-ignore: 세분 카테고리 캐논컬 표시 폴백 값
  shovel: '삽', // l10n-ignore: 세분 카테고리 캐논컬 표시 폴백 값
  hammer: '망치', // l10n-ignore: 세분 카테고리 캐논컬 표시 폴백 값
  microspikes: '아이젠', // l10n-ignore: 세분 카테고리 캐논컬 표시 폴백 값
  trekking_pole: '트레킹폴', // l10n-ignore: 세분 카테고리 캐논컬 표시 폴백 값
  etc: '그 외 기타', // l10n-ignore: 세분 카테고리 캐논컬 표시 폴백 값
  // 레거시 그룹 키 라벨 — 'lantern'·'furniture'·'cooking'은 세분 카테고리에서 제외했다(DM-4).
  // 라벨이 없으면 화면이 그룹 라벨로 폴백하므로 표시는 그대로다.
  electronic: '전자기기', // l10n-ignore: 세분 카테고리 캐논컬 표시 폴백 값
};

const FINE_CATEGORY_LABEL_KEYS: Record<string, string> = Object.keys(
  FINE_CATEGORY_LABELS
).reduce<Record<string, string>>((keys, category) => {
  keys[category] = `category.fine.${category}`;

  return keys;
}, {});

// 세분 카테고리 한글 라벨 조회. 매핑에 없으면 빈 문자열.
export const getFineCategoryLabel = (category: string): string => {
  return FINE_CATEGORY_LABELS[category]
    ? getAppTranslation(FINE_CATEGORY_LABEL_KEYS[category])
    : '';
};

/**
 * **칩으로 낼 수 있는** 세분 카테고리만 추린다(DM-4).
 *
 * 그룹 멤버에는 라벨 없는 레거시 그룹 키(`cooking`·`furniture`·`lantern`)가 섞여 있다 —
 * 조회(`where('category','in', ...)`)에는 필요하지만 칩으로 그리면 **글자 없는 빈 칩**이 된다.
 * 멤버 배열을 그대로 칩에 넘기지 말고 이 함수를 쓸 것.
 */
export const getSelectableFineCategories = (filter: GearFilter): string[] => {
  return getGroupMembers(filter).filter(key =>
    Boolean(FINE_CATEGORY_LABELS[key])
  );
};
