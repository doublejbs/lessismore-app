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
  shape: { label: '형태', type: 'string' },
  fillMaterial: {
    label: '충전재',
    type: 'enum',
    enumLabels: { down: '덕다운', synthetic: '합성' },
  },
  fillWeight: { label: '충전량', unit: 'g', type: 'number' },
  fillPower: { label: '필파워', unit: 'FP', type: 'number' },
  comfortTemp: { label: '편안 온도', unit: '°C', type: 'number' },
  limitTemp: { label: '한계 온도', unit: '°C', type: 'number' },
  zipperSide: {
    label: '지퍼 방향',
    type: 'enum',
    enumLabels: { left: '왼쪽', right: '오른쪽', center: '중앙' },
  },
};

const TENT_LIKE: Record<string, SpecFieldDef> = {
  capacity: { label: '수용 인원', unit: '인', type: 'number' },
  wallStructure: { label: '월 구조', type: 'string' },
  shape: { label: '형태', type: 'string' },
  innerMaterial: { label: '이너 소재', type: 'string' },
  flyMaterial: { label: '플라이 소재', type: 'string' },
  poleMaterial: { label: '폴 소재', type: 'string' },
  waterproofRating: { label: '내수압', unit: 'mm', type: 'number' },
  pitchType: { label: '설치 유형', type: 'string' },
  vestibuleArea: { label: '전실 면적', unit: 'm²', type: 'number' },
};

const MAT: Record<string, SpecFieldDef> = {
  type: { label: '타입', type: 'string' },
  shape: { label: '형태', type: 'string' },
  material: { label: '소재', type: 'string' },
  rValue: { label: 'R값', type: 'number' },
  thickness: { label: '두께', unit: 'mm', type: 'number' },
  openSize: { label: '펼쳤을때 크기', type: 'string' },
};

const BACKPACK_LIKE: Record<string, SpecFieldDef> = {
  volume: { label: '용량', unit: 'L', type: 'number' },
  material: { label: '소재', type: 'string' },
  frameType: { label: '프레임 타입', type: 'string' },
  backSystem: { label: '등판 시스템', type: 'string' },
  hasHipBelt: { label: '허리벨트', type: 'boolean' },
  hasShoulderBottlePocket: { label: '숄더 물통 주머니', type: 'boolean' },
  hasRainCover: { label: '레인커버', type: 'boolean' },
  gender: {
    label: '성별',
    type: 'enum',
    enumLabels: { male: '남성', female: '여성', unisex: '공용' },
  },
};

const STOVE_LIKE: Record<string, SpecFieldDef> = {
  material: { label: '소재', type: 'string' },
  fuelType: {
    label: '연료',
    type: 'enum',
    enumLabels: {
      gas: '가스',
      alcohol: '알코올',
      wood: '우드',
      liquid: '액체',
      multi: '멀티',
    },
  },
  output: { label: '화력', unit: 'W', type: 'number' },
  ignition: { label: '점화 방식', type: 'string' },
  hasWindscreen: { label: '윈드스크린 내장', type: 'boolean' },
};

const CUPWARE: Record<string, SpecFieldDef> = {
  material: { label: '소재', type: 'string' },
  capacity: { label: '용량', unit: 'ml', type: 'number' },
  isSet: { label: '세트 구성', type: 'boolean' },
};

const CUTLERY: Record<string, SpecFieldDef> = {
  material: { label: '소재', type: 'string' },
  isSet: { label: '세트 구성', type: 'boolean' },
};

const BOTTLE: Record<string, SpecFieldDef> = {
  material: { label: '소재', type: 'string' },
  capacity: { label: '용량', unit: 'ml', type: 'number' },
  isInsulated: { label: '보온보냉', type: 'boolean' },
  mouthType: { label: '입구 타입', type: 'string' },
};

const CLOTHING: Record<string, SpecFieldDef> = {
  type: { label: '종류', type: 'string' },
  material: { label: '소재', type: 'string' },
  isWaterproof: { label: '방수', type: 'boolean' },
  fillMaterial: { label: '충전재(다운류)', type: 'string' },
  hasHood: { label: '후드', type: 'boolean' },
};

const SUNGLASSES: Record<string, SpecFieldDef> = {
  lensMaterial: { label: '렌즈 소재', type: 'string' },
  uvProtection: { label: 'UV 차단 등급', type: 'string' },
  isPolarized: { label: '편광', type: 'boolean' },
};

const GLOVES: Record<string, SpecFieldDef> = {
  type: { label: '타입', type: 'string' },
  material: { label: '소재', type: 'string' },
  isWaterproof: { label: '방수', type: 'boolean' },
};

const GAITER: Record<string, SpecFieldDef> = {
  height: { label: '높이', unit: 'cm', type: 'number' },
  material: { label: '소재', type: 'string' },
  isWaterproof: { label: '방수', type: 'boolean' },
};

const CHAIR: Record<string, SpecFieldDef> = {
  material: { label: '소재', type: 'string' },
  frameMaterial: { label: '프레임 소재', type: 'string' },
  maxLoad: { label: '최대 하중', unit: 'kg', type: 'number' },
  packedSize: { label: '팩 사이즈', type: 'string' },
};

const TABLE: Record<string, SpecFieldDef> = {
  topMaterial: { label: '상판 소재', type: 'string' },
  frameMaterial: { label: '프레임 소재', type: 'string' },
  maxLoad: { label: '최대 하중', unit: 'kg', type: 'number' },
  packedSize: { label: '팩 사이즈', type: 'string' },
  isHeightAdjustable: { label: '높이 조절', type: 'boolean' },
};

const LIGHTING: Record<string, SpecFieldDef> = {
  type: { label: '타입', type: 'string' },
  maxBrightness: { label: '최대 밝기', unit: 'lm', type: 'number' },
  batteryType: { label: '배터리 타입', type: 'string' },
  waterproofRating: { label: '방수 등급', type: 'string' },
  maxRuntime: { label: '최대 사용시간', unit: 'hr', type: 'number' },
  hasRedMode: { label: '적색광 모드', type: 'boolean' },
};

const TREKKING_POLE: Record<string, SpecFieldDef> = {
  material: { label: '소재', type: 'string' },
  foldType: { label: '접이 방식', type: 'string' },
  lockType: { label: '잠금 방식', type: 'string' },
  minLength: { label: '최소 길이', unit: 'cm', type: 'number' },
  maxLength: { label: '최대 길이', unit: 'cm', type: 'number' },
};

const POUCH_LIKE: Record<string, SpecFieldDef> = {
  material: { label: '소재', type: 'string' },
  isWaterproof: { label: '방수', type: 'boolean' },
  capacity: { label: '용량', unit: 'L', type: 'number' },
};

const GENERIC: Record<string, SpecFieldDef> = {
  material: { label: '소재', type: 'string' },
  size: { label: '사이즈', type: 'string' },
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
    return value ? '예' : '아니오';
  }

  if (def.unit) {
    return `${value}${def.unit}`;
  }

  if (def.type === 'enum') {
    return def.enumLabels?.[String(value)] ?? String(value);
  }

  return String(value);
};
