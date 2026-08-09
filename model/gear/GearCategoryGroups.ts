import GearFilter from './GearFilter';

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
  [GearFilter.Furniture]: ['furniture', 'chair', 'table'],
  // 'lantern'은 세분 카테고리에서 뺐지만(DM-4, 2026-08-09) 그룹 멤버로는 남긴다 —
  // 커스텀 장비 등록이 아직 이 키를 저장하므로 빼면 랜턴 필터에서 빠져 기타로 떨어진다.
  [GearFilter.Lantern]: ['lantern', 'lighting', 'headlamp'],
  [GearFilter.Cooking]: [
    'cooking',
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
// 레거시 그룹 키(furniture/cooking/electronic) 라벨도 포함.
export const FINE_CATEGORY_LABELS: Record<string, string> = {
  backpack: '배낭',
  vest_pack: '베스트 배낭',
  backpack_cover: '배낭 커버',
  tent: '텐트',
  tarp: '타프',
  shelter: '쉘터',
  tent_acc: '텐트ACC',
  sleeping_bag: '침낭',
  mat: '매트',
  pillow: '필로우',
  cup: '컵',
  bowl: '그릇',
  cutlery: '수저',
  stove: '버너',
  torch: '토치',
  bottle: '물통',
  cookware_etc: '식기류 기타',
  chair: '체어',
  table: '테이블',
  clothing: '의류',
  sunglasses: '선글라스',
  gaiter: '스패츠',
  gloves: '장갑',
  lighting: '조명',
  headlamp: '헤드랜턴',
  food: '식품',
  towel: '수건',
  pouch: '파우치/수납가방',
  hand_warmer: '핫팩',
  shovel: '삽',
  hammer: '망치',
  microspikes: '아이젠',
  trekking_pole: '트레킹폴',
  etc: '그 외 기타',
  // 레거시 그룹 키 라벨 — 'lantern'은 세분 카테고리에서 제외했다(DM-4).
  // 라벨이 없으면 화면이 그룹 라벨('랜턴')로 폴백하므로 표시는 그대로다.
  furniture: '가구',
  cooking: '조리',
  electronic: '전자기기',
};

// 세분 카테고리 한글 라벨 조회. 매핑에 없으면 빈 문자열.
export const getFineCategoryLabel = (category: string): string => {
  return FINE_CATEGORY_LABELS[category] ?? '';
};
