// 카테고리별 스펙 스키마 — 웹 크롤 파이프라인(lessismore 레포
// .claude/skills/crawl-gear/specs-schema.js)의 TS 포팅 사본이다(DM-3 specs 계약).
// 필드 키·라벨·단위·타입을 웹과 동일하게 유지한다. 값은 number/string/boolean 또는 ''(빈 문자열).

export interface SpecFieldDef {
  label: string;
  type: 'string' | 'number' | 'boolean' | 'enum';
  unit?: string;
  enumLabels?: Record<string, string>;
}

const SLEEPING_BAG: Record<string, SpecFieldDef> = {
  shape: { label: 'shape', type: 'string' },
  fillMaterial: {
    label: 'fillMaterial',
    type: 'enum',
    enumLabels: { down: 'down', synthetic: 'synthetic' },
  },
  fillWeight: { label: 'fillWeight', unit: 'g', type: 'number' },
  fillPower: { label: 'fillPower', unit: 'FP', type: 'number' },
  comfortTemp: { label: 'comfortTemp', unit: '°C', type: 'number' },
  limitTemp: { label: 'limitTemp', unit: '°C', type: 'number' },
  zipperSide: {
    label: 'zipperSide',
    type: 'enum',
    enumLabels: { left: 'left', right: 'right', center: 'center' },
  },
};

const TENT_LIKE: Record<string, SpecFieldDef> = {
  capacity: { label: 'capacity', unit: 'person', type: 'number' },
  wallStructure: { label: 'wallStructure', type: 'string' },
  shape: { label: 'shape', type: 'string' },
  innerMaterial: { label: 'innerMaterial', type: 'string' },
  flyMaterial: { label: 'flyMaterial', type: 'string' },
  poleMaterial: { label: 'poleMaterial', type: 'string' },
  waterproofRating: { label: 'waterproofRating', unit: 'mm', type: 'number' },
  pitchType: { label: 'pitchType', type: 'string' },
  vestibuleArea: { label: 'vestibuleArea', unit: 'm²', type: 'number' },
};

const MAT: Record<string, SpecFieldDef> = {
  type: { label: 'type', type: 'string' },
  shape: { label: 'shape', type: 'string' },
  material: { label: 'material', type: 'string' },
  rValue: { label: 'rValue', type: 'number' },
  thickness: { label: 'thickness', unit: 'mm', type: 'number' },
  openSize: { label: 'openSize', type: 'string' },
};

const BACKPACK_LIKE: Record<string, SpecFieldDef> = {
  volume: { label: 'volume', unit: 'L', type: 'number' },
  material: { label: 'material', type: 'string' },
  frameType: { label: 'frameType', type: 'string' },
  backSystem: { label: 'backSystem', type: 'string' },
  hasHipBelt: { label: 'hasHipBelt', type: 'boolean' },
  hasShoulderBottlePocket: { label: 'hasShoulderBottlePocket', type: 'boolean' },
  hasRainCover: { label: 'hasRainCover', type: 'boolean' },
  gender: {
    label: 'gender',
    type: 'enum',
    enumLabels: { male: 'male', female: 'female', unisex: 'unisex' },
  },
};

const STOVE_LIKE: Record<string, SpecFieldDef> = {
  material: { label: 'material', type: 'string' },
  fuelType: {
    label: 'fuelType',
    type: 'enum',
    enumLabels: {
      gas: 'gas',
      alcohol: 'alcohol',
      wood: 'wood',
      liquid: 'liquid',
      multi: 'multi',
    },
  },
  output: { label: 'output', unit: 'W', type: 'number' },
  ignition: { label: 'ignition', type: 'string' },
  hasWindscreen: { label: 'hasWindscreen', type: 'boolean' },
};

const CUPWARE: Record<string, SpecFieldDef> = {
  material: { label: 'material', type: 'string' },
  capacity: { label: 'volume', unit: 'ml', type: 'number' },
  isSet: { label: 'isSet', type: 'boolean' },
};

const CUTLERY: Record<string, SpecFieldDef> = {
  material: { label: 'material', type: 'string' },
  isSet: { label: 'isSet', type: 'boolean' },
};

const BOTTLE: Record<string, SpecFieldDef> = {
  material: { label: 'material', type: 'string' },
  capacity: { label: 'volume', unit: 'ml', type: 'number' },
  isInsulated: { label: 'isInsulated', type: 'boolean' },
  mouthType: { label: 'mouthType', type: 'string' },
};

const CLOTHING: Record<string, SpecFieldDef> = {
  type: { label: 'type', type: 'string' },
  material: { label: 'material', type: 'string' },
  isWaterproof: { label: 'isWaterproof', type: 'boolean' },
  fillMaterial: { label: 'fillMaterialClothing', type: 'string' },
  hasHood: { label: 'hasHood', type: 'boolean' },
};

const SUNGLASSES: Record<string, SpecFieldDef> = {
  lensMaterial: { label: 'lensMaterial', type: 'string' },
  uvProtection: { label: 'uvProtection', type: 'string' },
  isPolarized: { label: 'isPolarized', type: 'boolean' },
};

const GLOVES: Record<string, SpecFieldDef> = {
  type: { label: 'type', type: 'string' },
  material: { label: 'material', type: 'string' },
  isWaterproof: { label: 'isWaterproof', type: 'boolean' },
};

const GAITER: Record<string, SpecFieldDef> = {
  height: { label: 'height', unit: 'cm', type: 'number' },
  material: { label: 'material', type: 'string' },
  isWaterproof: { label: 'isWaterproof', type: 'boolean' },
};

const CHAIR: Record<string, SpecFieldDef> = {
  material: { label: 'material', type: 'string' },
  frameMaterial: { label: 'frameMaterial', type: 'string' },
  maxLoad: { label: 'maxLoad', unit: 'kg', type: 'number' },
  packedSize: { label: 'packedSize', type: 'string' },
};

const TABLE: Record<string, SpecFieldDef> = {
  topMaterial: { label: 'topMaterial', type: 'string' },
  frameMaterial: { label: 'frameMaterial', type: 'string' },
  maxLoad: { label: 'maxLoad', unit: 'kg', type: 'number' },
  packedSize: { label: 'packedSize', type: 'string' },
  isHeightAdjustable: { label: 'isHeightAdjustable', type: 'boolean' },
};

const LIGHTING: Record<string, SpecFieldDef> = {
  type: { label: 'type', type: 'string' },
  maxBrightness: { label: 'maxBrightness', unit: 'lm', type: 'number' },
  batteryType: { label: 'batteryType', type: 'string' },
  waterproofRating: { label: 'waterproofRating', type: 'string' },
  maxRuntime: { label: 'maxRuntime', unit: 'hr', type: 'number' },
  hasRedMode: { label: 'hasRedMode', type: 'boolean' },
};

const TREKKING_POLE: Record<string, SpecFieldDef> = {
  material: { label: 'material', type: 'string' },
  foldType: { label: 'foldType', type: 'string' },
  lockType: { label: 'lockType', type: 'string' },
  minLength: { label: 'minLength', unit: 'cm', type: 'number' },
  maxLength: { label: 'maxLength', unit: 'cm', type: 'number' },
};

const POUCH_LIKE: Record<string, SpecFieldDef> = {
  material: { label: 'material', type: 'string' },
  isWaterproof: { label: 'isWaterproof', type: 'boolean' },
  capacity: { label: 'volume', unit: 'L', type: 'number' },
};

const GENERIC: Record<string, SpecFieldDef> = {
  material: { label: 'material', type: 'string' },
  size: { label: 'size', type: 'string' },
};

export const SPECS_SCHEMA: Record<string, Record<string, SpecFieldDef>> = {
  // 텐트/타프/쉘터
  tent: TENT_LIKE,
  tarp: TENT_LIKE,
  shelter: TENT_LIKE,
  // 침낭
  sleeping_bag: SLEEPING_BAG,
  // 매트
  mat: MAT,
  // 배낭/베스트 배낭
  backpack: BACKPACK_LIKE,
  vest_pack: BACKPACK_LIKE,
  // 버너/토치
  stove: STOVE_LIKE,
  torch: STOVE_LIKE,
  // 식기류
  cup: CUPWARE,
  bowl: CUPWARE,
  cookware_etc: CUPWARE,
  // 수저
  cutlery: CUTLERY,
  // 물통
  bottle: BOTTLE,
  // 의류
  clothing: CLOTHING,
  // 선글라스
  sunglasses: SUNGLASSES,
  // 장갑
  gloves: GLOVES,
  // 게이터
  gaiter: GAITER,
  // 가구
  chair: CHAIR,
  table: TABLE,
  // 조명
  lighting: LIGHTING,
  // 트레킹폴
  trekking_pole: TREKKING_POLE,
  // 파우치/배낭커버
  pouch: POUCH_LIKE,
  backpack_cover: POUCH_LIKE,
  // 소재+사이즈만
  tent_acc: GENERIC,
  pillow: GENERIC,
  food: GENERIC,
  towel: GENERIC,
  hand_warmer: GENERIC,
  shovel: GENERIC,
  hammer: GENERIC,
  microspikes: GENERIC,
  etc: GENERIC,
};

// 카테고리의 스펙 스키마 조회. 스키마 없는 카테고리는 빈 객체.
export const getSpecsSchemaFor = (
  category: string
): Record<string, SpecFieldDef> => {
  return SPECS_SCHEMA[category] ?? {};
};

// 스펙 값을 표시 문자열로 변환한다 — 웹 formatSpecValue와 동일 규칙.
// ''/null/undefined → '', boolean → 예/아니오, unit → `${value}${unit}`,
// enum → enumLabels 한글 라벨(없으면 원문).
export const formatSpecValue = (
  key: string,
  value: string | number | boolean | null | undefined,
  schema: Record<string, SpecFieldDef>
): string => {
  if (value === '' || value === null || value === undefined) {
    return '';
  }

  const def = schema[key];

  if (!def) {
    return String(value);
  }

  if (def.type === 'boolean') {
    return value ? 'specBooleanTrue' : 'specBooleanFalse';
  }

  if (def.unit) {
    return `${value}${def.unit}`;
  }

  if (def.type === 'enum') {
    return def.enumLabels?.[String(value)] ?? String(value);
  }

  return String(value);
};
